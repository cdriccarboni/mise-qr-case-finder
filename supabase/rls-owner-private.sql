-- MISES! — RLS espace personnel (à appliquer sur le projet Supabase)
-- Objectif : aucune lecture/écriture de mises_records / mises_assets hors membership.
-- Le corpus privé de Cédric n'est jamais dans le dépôt git ; il n'est accessible
-- qu'après connexion magic-link sur cdric.carboni@gmail.com, dans son space perso.

-- Tables concernées (déjà créées côté projet) :
--   mises_spaces(id, owner_id, name, kind, ...)
--   mises_memberships(space_id, user_id, role, ...)
--   mises_records(space_id, store_name, record_id, payload, ...)
--   mises_assets(space_id, store_name, record_id, path, ...)

alter table if exists public.mises_spaces enable row level security;
alter table if exists public.mises_memberships enable row level security;
alter table if exists public.mises_records enable row level security;
alter table if exists public.mises_assets enable row level security;

-- Helpers
create or replace function public.mises_is_space_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mises_memberships m
    where m.space_id = target and m.user_id = auth.uid()
  );
$$;

create or replace function public.mises_is_space_owner(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mises_spaces s
    where s.id = target and s.owner_id = auth.uid()
  );
$$;

-- Spaces : le propriétaire voit/crée ses espaces ; les membres lisent.
drop policy if exists mises_spaces_select on public.mises_spaces;
create policy mises_spaces_select on public.mises_spaces
  for select to authenticated
  using (owner_id = auth.uid() or public.mises_is_space_member(id));

drop policy if exists mises_spaces_insert on public.mises_spaces;
create policy mises_spaces_insert on public.mises_spaces
  for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists mises_spaces_update on public.mises_spaces;
create policy mises_spaces_update on public.mises_spaces
  for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Memberships
drop policy if exists mises_memberships_select on public.mises_memberships;
create policy mises_memberships_select on public.mises_memberships
  for select to authenticated
  using (user_id = auth.uid() or public.mises_is_space_owner(space_id));

drop policy if exists mises_memberships_insert on public.mises_memberships;
create policy mises_memberships_insert on public.mises_memberships
  for insert to authenticated
  with check (user_id = auth.uid() or public.mises_is_space_owner(space_id));

-- Records : strictement limité au membership de l'espace
drop policy if exists mises_records_select on public.mises_records;
create policy mises_records_select on public.mises_records
  for select to authenticated
  using (public.mises_is_space_member(space_id));

drop policy if exists mises_records_upsert on public.mises_records;
create policy mises_records_write on public.mises_records
  for all to authenticated
  using (public.mises_is_space_member(space_id))
  with check (public.mises_is_space_member(space_id));

-- Assets (photos)
drop policy if exists mises_assets_select on public.mises_assets;
create policy mises_assets_select on public.mises_assets
  for select to authenticated
  using (public.mises_is_space_member(space_id));

drop policy if exists mises_assets_write on public.mises_assets;
create policy mises_assets_write on public.mises_assets
  for all to authenticated
  using (public.mises_is_space_member(space_id))
  with check (public.mises_is_space_member(space_id));

-- Note opérationnelle propriétaire :
-- 1. Se connecter dans MISES! avec le magic-link envoyé à cdric.carboni@gmail.com
-- 2. Importer le classeur privé EN LOCAL (jamais dans git)
-- 3. Synchroniser → les lignes partent dans le space personnel RLS
-- 4. Aucun autre compte ne peut lire ce space
