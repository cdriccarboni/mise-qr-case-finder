-- Optionnel, non appliqué automatiquement : permet la suppression Auth même si
-- une fiche/ressource conservée référence encore son dernier auteur.
do $$
declare constraint_row record;
begin
  for constraint_row in
    select c.conrelid::regclass as relation_name, c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
    where c.contype = 'f'
      and c.confrelid = 'auth.users'::regclass
      and ((c.conrelid = 'public.mises_records'::regclass and a.attname = 'updated_by')
        or (c.conrelid = 'public.mises_assets'::regclass and a.attname = 'created_by'))
  loop
    execute format('alter table %s drop constraint %I', constraint_row.relation_name, constraint_row.conname);
  end loop;

  if not exists (
    select 1 from pg_constraint where conrelid = 'public.mises_records'::regclass and conname = 'mises_records_updated_by_fkey'
  ) then
    alter table public.mises_records add constraint mises_records_updated_by_fkey
      foreign key (updated_by) references auth.users(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conrelid = 'public.mises_assets'::regclass and conname = 'mises_assets_created_by_fkey'
  ) then
    alter table public.mises_assets add constraint mises_assets_created_by_fkey
      foreign key (created_by) references auth.users(id) on delete set null;
  end if;
end $$;
