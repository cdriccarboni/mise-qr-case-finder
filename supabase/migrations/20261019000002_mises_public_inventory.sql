-- MISES! V2 — inventaire PUBLIC en lecture seule (décision Cédric, 19/10/2026).
-- Anon : aucune lecture directe des tables. Accès uniquement via get_public_inventory() (security definer),
-- qui ne renvoie que des champs d'inventaire en liste blanche, pour les espaces marqués public_inventory.
-- Écritures : inchangées, authentifié + membre (RLS de 20261019000001).
alter table public.mises_spaces add column if not exists public_inventory boolean not null default false;

create or replace function public.mises_public_row(p jsonb)
returns boolean language sql immutable as $$
  select coalesce(upper(p->>'publicationScope'),'') <> 'PRIVE_ONLY'
     and coalesce((p->>'private')::boolean,false) = false
     and not coalesce(p->'tags' ? 'data-bruitage-v5', false);
$$;

create or replace function public.get_public_inventory()
returns jsonb language sql stable security definer set search_path = public as $$
  with pub as (select id from public.mises_spaces where public_inventory),
  rec as (
    select r.store_name, r.record_id, r.payload from public.mises_records r
    join pub on pub.id = r.space_id
    where r.deleted_at is null and public.mises_public_row(r.payload)
  )
  select jsonb_build_object(
    'cases', coalesce((select jsonb_agg(jsonb_build_object(
      'id', record_id, 'name', payload->>'name', 'parentId', payload->>'parentId',
      'type', payload->>'type', 'location', payload->>'location', 'color', payload->>'color'))
      from rec where store_name = 'cases'), '[]'::jsonb),
    'objects', coalesce((select jsonb_agg(jsonb_build_object(
      'id', record_id, 'name', payload->>'name', 'nickname', payload->>'nickname',
      'caseId', coalesce(payload->>'caseId', payload->>'container_id'),
      'compartment', payload->>'compartment', 'quantity', payload->'quantity',
      'family', payload->>'family', 'status', payload->>'status', 'location', payload->>'location',
      'length', payload->>'length', 'color', payload->>'color',
      'sounds', payload->'sounds', 'methods', payload->'methods',
      'photoPaths', coalesce(payload->'photoAssetPaths', case when payload ? 'photoAssetPath' then jsonb_build_array(payload->>'photoAssetPath') else '[]'::jsonb end)))
      from rec where store_name = 'objects' and coalesce((payload->>'owned')::boolean, true)), '[]'::jsonb),
    'sounds', coalesce((select jsonb_agg(jsonb_build_object('id', record_id, 'name', payload->>'name', 'aliases', payload->'aliases'))
      from rec where store_name = 'sounds'), '[]'::jsonb),
    'objectSounds', coalesce((select jsonb_agg(jsonb_build_object(
      'object_id', coalesce(payload->>'object_id', payload->>'objectId'), 'sound_id', coalesce(payload->>'sound_id', payload->>'soundId'),
      'technique', coalesce(payload->>'technique', payload->>'method')))
      from rec where store_name = 'objectSounds'), '[]'::jsonb)
  );
$$;
revoke all on function public.get_public_inventory() from public;
grant execute on function public.get_public_inventory() to anon, authenticated;

-- Photos d'inventaire : lecture anon seulement sous un espace public (1er segment du chemin).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='mises_photos_public_read') then
    create policy mises_photos_public_read on storage.objects for select to anon
      using (bucket_id = 'mises-photos' and exists (
        select 1 from public.mises_spaces s where s.public_inventory
          and s.id::text = (storage.foldername(name))[1]));
  end if;
end $$;
-- Activation (manuelle, par le propriétaire) : update public.mises_spaces set public_inventory = true where id = '<space_id>';
