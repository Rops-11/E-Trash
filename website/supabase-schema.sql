-- Run once in the Supabase project's SQL Editor, using the project owner.
-- Safe to rerun: existing readings and settings are preserved.
begin;

create table if not exists public.e_trash_device_status (
  device_id text primary key check (device_id ~ '^e-trash-[a-f0-9]{1,12}$'),
  received_at bigint not null check (received_at >= 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);
create index if not exists e_trash_device_status_received_at
  on public.e_trash_device_status (received_at desc);

create table if not exists public.e_trash_device_settings (
  id smallint primary key check (id = 1),
  revision integer not null check (revision > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object')
);

alter table public.e_trash_device_status enable row level security;
alter table public.e_trash_device_settings enable row level security;

-- No browser/anonymous policies: only the authorized Next.js server accesses
-- these tables. The server independently checks dashboard sessions/device tokens.
revoke all on table public.e_trash_device_status from public, anon, authenticated;
revoke all on table public.e_trash_device_settings from public, anon, authenticated;
grant select, insert, update on table public.e_trash_device_status to service_role;
grant select, insert, update on table public.e_trash_device_settings to service_role;

create or replace function public.e_trash_save_settings(p_payload jsonb)
returns table (revision integer, payload jsonb)
language sql
security invoker
set search_path = ''
as $$
  insert into public.e_trash_device_settings as stored (id, revision, payload)
  values (1, 1, p_payload)
  on conflict (id) do update
    set revision = stored.revision + 1,
        payload = excluded.payload
  returning stored.revision, stored.payload;
$$;

revoke all on function public.e_trash_save_settings(jsonb) from public, anon, authenticated;
grant execute on function public.e_trash_save_settings(jsonb) to service_role;

notify pgrst, 'reload schema';
commit;
