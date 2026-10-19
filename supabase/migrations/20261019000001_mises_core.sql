-- MISES! V2 — schéma cœur, idempotent. Aucun DROP TABLE / DELETE / TRUNCATE.
-- Correspond à src/sync-core.js (mises_spaces, mises_memberships, mises_records, mises_assets, bucket mises-photos).
create extension if not exists pgcrypto;

create table if not exists public.mises_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Mon stock MISES!',
  kind text not null default 'personal',
  created_at timestamptz not null default now()
);

create table if not exists public.mises_memberships (
  space_id uuid not null references public.mises_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','editor','member','viewer')),
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.mises_records (
  space_id uuid not null references public.mises_spaces(id) on delete cascade,
  store_name text not null,
  record_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  revision integer not null default 1,
  primary key (space_id, store_name, record_id)
);
create index if not exists mises_records_space_store_idx on public.mises_records(space_id, store_name);

create table if not exists public.mises_assets (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.mises_spaces(id) on delete cascade,
  store_name text not null,
  record_id text not null,
  path text not null unique,
  mime_type text,
  bytes bigint,
  kind text not null default 'photo',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mises_assets add column if not exists kind text not null default 'photo';
create index if not exists mises_assets_record_idx on public.mises_assets(space_id, store_name, record_id);

-- Helpers (security definer : évite la récursion RLS).
create or replace function public.mises_is_space_member(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mises_memberships m where m.space_id = target and m.user_id = auth.uid());
$$;
create or replace function public.mises_is_space_owner(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.mises_spaces s where s.id = target and s.owner_id = auth.uid());
$$;

alter table public.mises_spaces enable row level security;
alter table public.mises_memberships enable row level security;
alter table public.mises_records enable row level security;
alter table public.mises_assets enable row level security;

-- Création idempotente des policies (ne remplace pas une policy existante).
do $$
declare p record;
begin
  for p in select * from (values
    ('mises_spaces','mises_spaces_select','select','(owner_id = auth.uid() or public.mises_is_space_member(id))',null),
    ('mises_spaces','mises_spaces_insert','insert',null,'(owner_id = auth.uid())'),
    ('mises_spaces','mises_spaces_update','update','(owner_id = auth.uid())','(owner_id = auth.uid())'),
    ('mises_memberships','mises_memberships_select','select','(user_id = auth.uid() or public.mises_is_space_owner(space_id))',null),
    ('mises_memberships','mises_memberships_insert','insert',null,'(public.mises_is_space_owner(space_id))'),
    ('mises_records','mises_records_select','select','(public.mises_is_space_member(space_id))',null),
    ('mises_records','mises_records_write','all','(public.mises_is_space_member(space_id))','(public.mises_is_space_member(space_id))'),
    ('mises_assets','mises_assets_select','select','(public.mises_is_space_member(space_id))',null),
    ('mises_assets','mises_assets_write','all','(public.mises_is_space_member(space_id))','(public.mises_is_space_member(space_id))')
  ) as t(tbl, name, cmd, using_expr, check_expr)
  loop
    if not exists (select 1 from pg_policies where schemaname='public' and tablename=p.tbl and policyname=p.name) then
      execute format('create policy %I on public.%I for %s to authenticated %s %s', p.name, p.tbl, p.cmd,
        coalesce('using '||p.using_expr,''), coalesce('with check '||p.check_expr,''));
    end if;
  end loop;
end $$;

-- Storage : bucket privé, chemins "<space_id>/<store>/<record>[...]".
insert into storage.buckets (id, name, public) values ('mises-photos','mises-photos', false)
on conflict (id) do update set public = false;

do $$
declare p record;
begin
  for p in select * from (values
    ('mises_photos_select','select','using (bucket_id = ''mises-photos'' and public.mises_is_space_member(((storage.foldername(name))[1])::uuid))'),
    ('mises_photos_insert','insert','with check (bucket_id = ''mises-photos'' and public.mises_is_space_member(((storage.foldername(name))[1])::uuid))'),
    ('mises_photos_update','update','using (bucket_id = ''mises-photos'' and public.mises_is_space_member(((storage.foldername(name))[1])::uuid))'),
    ('mises_photos_delete','delete','using (bucket_id = ''mises-photos'' and public.mises_is_space_member(((storage.foldername(name))[1])::uuid))')
  ) as t(name, cmd, clause)
  loop
    if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname=p.name) then
      execute format('create policy %I on storage.objects for %s to authenticated %s', p.name, p.cmd, p.clause);
    end if;
  end loop;
end $$;
