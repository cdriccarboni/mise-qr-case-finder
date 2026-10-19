-- MISES! V2 — partage public en lecture seule d'UN contenant (opt-in, révocable).
-- Le token est aléatoire (192 bits), distinct de l'ID permanent imprimé dans le QR.
create table if not exists public.mises_container_shares (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.mises_spaces(id) on delete cascade,
  container_id text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  include_photos boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_accessed_at timestamptz,
  access_count bigint not null default 0
);
create index if not exists mises_container_shares_space_idx on public.mises_container_shares(space_id, container_id);
alter table public.mises_container_shares enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mises_container_shares' and policyname='mises_shares_member_select') then
    create policy mises_shares_member_select on public.mises_container_shares for select to authenticated
      using (public.mises_is_space_member(space_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mises_container_shares' and policyname='mises_shares_member_insert') then
    create policy mises_shares_member_insert on public.mises_container_shares for insert to authenticated
      with check (public.mises_is_space_member(space_id) and created_by = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='mises_container_shares' and policyname='mises_shares_member_update') then
    create policy mises_shares_member_update on public.mises_container_shares for update to authenticated
      using (public.mises_is_space_member(space_id)) with check (public.mises_is_space_member(space_id));
  end if;
end $$;
-- Pas de policy anon : l'accès public passe uniquement par la RPC ci-dessous.

create or replace function public.get_shared_container(share_token text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  s public.mises_container_shares;
  ids text[];
  result jsonb;
begin
  if share_token is null or length(share_token) < 32 then return null; end if;
  select * into s from public.mises_container_shares
   where token = share_token and revoked_at is null and (expires_at is null or expires_at > now());
  if not found then return null; end if;

  with recursive tree(id) as (
    select s.container_id
    union
    select r.record_id from public.mises_records r join tree t on r.payload->>'parentId' = t.id
     where r.space_id = s.space_id and r.store_name = 'cases' and r.deleted_at is null
  ) select array_agg(id) into ids from tree;

  select jsonb_build_object(
    'container_id', s.container_id,
    'containers', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.record_id, 'name', r.payload->>'name', 'parentId', r.payload->>'parentId',
        'type', r.payload->>'type', 'location', r.payload->>'location'))
      from public.mises_records r where r.space_id = s.space_id and r.store_name = 'cases'
       and r.deleted_at is null and r.record_id = any(ids)), '[]'::jsonb),
    'objects', coalesce((select jsonb_agg(jsonb_build_object(
        'id', r.record_id, 'name', r.payload->>'name',
        'caseId', coalesce(r.payload->>'caseId', r.payload->>'container_id'),
        'compartment', r.payload->>'compartment', 'quantity', r.payload->'quantity',
        'family', r.payload->>'family', 'status', r.payload->>'status')
        || case when s.include_photos then jsonb_build_object('photoPaths', r.payload->'photoAssetPaths') else '{}'::jsonb end)
      from public.mises_records r where r.space_id = s.space_id and r.store_name = 'objects'
       and r.deleted_at is null and coalesce(r.payload->>'caseId', r.payload->>'container_id') = any(ids)), '[]'::jsonb)
  ) into result;

  update public.mises_container_shares set last_accessed_at = now(), access_count = access_count + 1 where id = s.id;
  return result;
end $$;
revoke all on function public.get_shared_container(text) from public;
grant execute on function public.get_shared_container(text) to anon, authenticated;
