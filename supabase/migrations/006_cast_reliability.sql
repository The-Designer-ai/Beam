create table if not exists public.cast_diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.cast_sessions(id) on delete cascade,
  request_id uuid references public.cast_requests(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  role text not null check (role in ('sender', 'receiver')),
  event text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists cast_diagnostics_session_created_idx
  on public.cast_diagnostics (session_id, created_at);

alter table public.cast_diagnostics enable row level security;

drop policy if exists "users create their cast diagnostics" on public.cast_diagnostics;
create policy "users create their cast diagnostics" on public.cast_diagnostics
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "users read their cast diagnostics" on public.cast_diagnostics;
create policy "users read their cast diagnostics" on public.cast_diagnostics
  for select to authenticated
  using (user_id = (select auth.uid()));

grant insert, select on public.cast_diagnostics to authenticated;

create table if not exists public.push_delivery_receipts (
  ticket_id text primary key,
  device_id uuid not null references public.devices(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'ok', 'error')),
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  checked_at timestamptz
);

alter table public.push_delivery_receipts enable row level security;
revoke all on public.push_delivery_receipts from anon, authenticated;

drop function if exists public.list_saved_devices(uuid);
create function public.list_saved_devices(p_current_device_id uuid)
returns table(
  device_id uuid,
  device_owner_id uuid,
  device_name text,
  device_type text,
  device_online boolean,
  device_last_seen timestamptz,
  owner_display_name text,
  owner_domain text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    d.id,
    d.owner_id,
    d.name,
    d.type,
    d.online,
    d.last_seen,
    p.display_name,
    p.domain
  from public.devices d
  join public.profiles p on p.id = d.owner_id
  where (select auth.uid()) is not null
    and d.id <> p_current_device_id
    and (
      d.owner_id = (select auth.uid())
      or exists (
        select 1
        from public.device_access da
        where da.device_id = d.id
          and da.grantee_user_id = (select auth.uid())
          and da.status = 'approved'
      )
    )
  order by d.online desc, d.last_seen desc;
$$;

revoke all on function public.list_saved_devices(uuid) from public;
grant execute on function public.list_saved_devices(uuid) to authenticated;
