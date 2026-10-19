-- MISES! 0.4.0-beta.28 (#45) — seed owner-only + archive/suppression douce. Idempotent. Aucune donnée ici :
-- les lignes de seed (contenants privés) sont insérées hors dépôt, via le connecteur Supabase.
create table if not exists public.mises_owner_seeds (
  email text not null,
  store_name text not null,
  record_id text not null,
  payload jsonb not null,
  claimed_at timestamptz,
  primary key (email, store_name, record_id)
);
-- RLS activée, AUCUNE policy : illisible par anon/authenticated ; seule la fonction ci-dessous y accède.
alter table public.mises_owner_seeds enable row level security;
revoke all on public.mises_owner_seeds from anon, authenticated;

create or replace function public.mises_claim_owner_seed()
returns integer language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); mail text; sid uuid; n integer := 0;
begin
  if uid is null then return 0; end if;
  select lower(email) into mail from auth.users where id = uid and email_confirmed_at is not null;
  if mail is null or not exists (select 1 from public.mises_owner_seeds where email = mail) then return 0; end if;
  select s.id into sid from public.mises_spaces s where s.owner_id = uid order by s.created_at limit 1;
  if sid is null then
    insert into public.mises_spaces(owner_id, name, kind) values (uid, 'Mon stock MISES!', 'personal') returning id into sid;
  end if;
  insert into public.mises_memberships(space_id, user_id, role) values (sid, uid, 'owner') on conflict do nothing;
  -- Jamais d'écrasement : une fiche déjà présente (renommée, archivée…) est conservée telle quelle.
  insert into public.mises_records(space_id, store_name, record_id, payload, updated_by)
    select sid, store_name, record_id, payload, uid from public.mises_owner_seeds where email = mail
  on conflict (space_id, store_name, record_id) do nothing;
  get diagnostics n = row_count;
  update public.mises_owner_seeds set claimed_at = coalesce(claimed_at, now()) where email = mail;
  return n;
end $$;
revoke all on function public.mises_claim_owner_seed() from public, anon;
grant execute on function public.mises_claim_owner_seed() to authenticated;

-- Inventaire public : les contenants supprimés (suppression douce) ne sont jamais publiés.
create or replace function public.mises_public_row(p jsonb)
returns boolean language sql immutable as $$
  select coalesce(upper(p->>'publicationScope'),'') <> 'PRIVE_ONLY'
     and coalesce((p->>'private')::boolean,false) = false
     and not coalesce(p->'tags' ? 'data-bruitage-v5', false)
     and coalesce(p->>'labelState','') <> 'deleted';
$$;
