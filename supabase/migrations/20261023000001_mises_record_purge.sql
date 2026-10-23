-- MISES! — purge réelle des fiches. Idempotent : aucun DELETE n'est exécuté
-- au chargement de cette migration ; les suppressions vivent dans les triggers,
-- le RPC autorisé et le job quotidien ci-dessous.

-- Un tombstone ne transporte jamais de fiche, mémo ou chemin de photo. Le payload minimal
-- {id, labelState:'deleted'} (aucune donnée utilisateur) évite qu'un client 0.4.0-beta.35, qui ne connaît
-- pas deleted_at, n'écrive une ligne sans clé dans IndexedDB : il la traite comme un contenant supprimé.
-- deleted_at est fixé par l'horloge du serveur au moment de la suppression.
create or replace function public.mises_records_strip_tombstone()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.deleted_at is not null then
    if tg_op = 'INSERT' or old.deleted_at is null then
      new.deleted_at := now();
    end if;
    new.payload := jsonb_build_object('id', new.record_id, 'labelState', 'deleted');
  end if;
  return new;
end;
$$;

drop trigger if exists mises_records_strip_tombstone_trigger on public.mises_records;
create trigger mises_records_strip_tombstone_trigger
before insert or update on public.mises_records
for each row execute function public.mises_records_strip_tombstone();

-- Filets de sûreté pour les métadonnées encore présentes : les fichiers Storage
-- restent supprimés par le client, car storage.objects interdit ce DELETE SQL.
create or replace function public.mises_records_delete_tombstone_assets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deleted_at is not null then
    delete from public.mises_assets
      where space_id = new.space_id
        and store_name = new.store_name
        and record_id = new.record_id;
  end if;
  return new;
end;
$$;

revoke all on function public.mises_records_delete_tombstone_assets() from public, anon, authenticated;

drop trigger if exists mises_records_delete_tombstone_assets_trigger on public.mises_records;
create trigger mises_records_delete_tombstone_assets_trigger
after insert or update on public.mises_records
for each row when (new.deleted_at is not null)
execute function public.mises_records_delete_tombstone_assets();

-- Les tombstones sont nécessaires aux autres appareils pendant 30 jours, puis
-- le job planifié les efface. Le nom stable rend la relecture de la migration idempotente.
create index if not exists mises_records_tombstone_idx on public.mises_records(deleted_at) where deleted_at is not null;
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid)
from cron.job
where jobname = 'mises-purge-tombstones';
-- Exception : un tombstone qui correspond à un seed propriétaire (mises_owner_seeds) est conservé
-- (sans contenu) pour empêcher mises_claim_owner_seed() de réinsérer la fiche supprimée.
create or replace function public.mises_tombstone_is_seed(target_space uuid, target_store text, target_record text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.mises_spaces sp
    join auth.users u on u.id = sp.owner_id
    join public.mises_owner_seeds seed on seed.email = lower(u.email)
    where sp.id = target_space
      and seed.store_name = target_store
      and seed.record_id = target_record
  );
$$;
revoke all on function public.mises_tombstone_is_seed(uuid, text, text) from public, anon, authenticated;

select cron.schedule('mises-purge-tombstones', '17 3 * * *', $$delete from public.mises_records r where r.deleted_at is not null and r.deleted_at < now() - interval '30 days' and not public.mises_tombstone_is_seed(r.space_id, r.store_name, r.record_id)$$);

-- Entretien opportuniste depuis l'app : un membre ne peut retirer que les
-- tombstones âgés de ses propres espaces ; le cron conserve le nettoyage global.
create or replace function public.mises_purge_tombstones()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare removed integer := 0;
begin
  delete from public.mises_records r
  where r.deleted_at is not null
    and r.deleted_at < now() - interval '30 days'
    and not public.mises_tombstone_is_seed(r.space_id, r.store_name, r.record_id)
    and exists (
      select 1 from public.mises_memberships membership
      where membership.space_id = r.space_id
        and membership.user_id = auth.uid()
    );
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke all on function public.mises_purge_tombstones() from public, anon;
grant execute on function public.mises_purge_tombstones() to authenticated;
