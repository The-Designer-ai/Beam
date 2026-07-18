create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null,
  domain text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('ios', 'android', 'web')),
  push_token text,
  online boolean not null default false,
  last_seen timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_access (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices(id) on delete cascade,
  grantee_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'revoked')),
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (device_id, grantee_user_id)
);

create table if not exists public.device_invites (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  target_device_id uuid references public.devices(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now()
);

create table if not exists public.cast_sessions (
  id uuid primary key default gen_random_uuid(),
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_device_id uuid references public.devices(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'ended', 'expired')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table if not exists public.cast_requests (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cast_sessions(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  sender_device_id uuid references public.devices(id) on delete set null,
  receiver_device_id uuid not null references public.devices(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired', 'ended')),
  expires_at timestamptz not null default (now() + interval '1 minute'),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create table if not exists public.webrtc_signals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.cast_sessions(id) on delete cascade,
  request_id uuid references public.cast_requests(id) on delete cascade,
  sender_device_id uuid references public.devices(id) on delete cascade,
  target_device_id uuid references public.devices(id) on delete cascade,
  signal_type text not null check (signal_type in ('offer', 'answer', 'ice', 'leave')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.device_access enable row level security;
alter table public.device_invites enable row level security;
alter table public.cast_sessions enable row level security;
alter table public.cast_requests enable row level security;
alter table public.webrtc_signals enable row level security;

drop policy if exists "profiles own row" on public.profiles;
create policy "profiles own row" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "devices visible to owner or approved users" on public.devices;
create policy "devices visible to owner or approved users" on public.devices
  for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.device_access da
      where da.device_id = devices.id
      and da.grantee_user_id = auth.uid()
      and da.status = 'approved'
    )
  );

drop policy if exists "device owners manage devices" on public.devices;
create policy "device owners manage devices" on public.devices
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "device access visible to related users" on public.device_access;
create policy "device access visible to related users" on public.device_access
  for select using (
    grantee_user_id = auth.uid()
    or created_by = auth.uid()
    or exists (
      select 1 from public.devices d
      where d.id = device_access.device_id
      and d.owner_id = auth.uid()
    )
  );

drop policy if exists "device access request by authenticated user" on public.device_access;
create policy "device access request by authenticated user" on public.device_access
  for insert with check (created_by = auth.uid());

drop policy if exists "device access update by owner or grantee" on public.device_access;
create policy "device access update by owner or grantee" on public.device_access
  for update using (
    grantee_user_id = auth.uid()
    or exists (
      select 1 from public.devices d
      where d.id = device_access.device_id
      and d.owner_id = auth.uid()
    )
  );

drop policy if exists "device invites own" on public.device_invites;
create policy "device invites own" on public.device_invites
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

drop policy if exists "cast sessions related users" on public.cast_sessions;
create policy "cast sessions related users" on public.cast_sessions
  for all using (
    sender_user_id = auth.uid()
    or exists (
      select 1
      from public.cast_requests cr
      join public.devices d on d.id = cr.receiver_device_id
      where cr.session_id = cast_sessions.id
      and d.owner_id = auth.uid()
    )
  ) with check (sender_user_id = auth.uid());

drop policy if exists "cast requests related users" on public.cast_requests;
create policy "cast requests related users" on public.cast_requests
  for all using (
    sender_user_id = auth.uid()
    or exists (
      select 1 from public.devices d
      where d.id = cast_requests.receiver_device_id
      and d.owner_id = auth.uid()
    )
  ) with check (
    sender_user_id = auth.uid()
    or exists (
      select 1 from public.devices d
      where d.id = cast_requests.receiver_device_id
      and d.owner_id = auth.uid()
    )
  );

drop policy if exists "signals related users" on public.webrtc_signals;
create policy "signals related users" on public.webrtc_signals
  for all using (
    exists (
      select 1 from public.cast_sessions cs
      where cs.id = webrtc_signals.session_id
      and cs.sender_user_id = auth.uid()
    )
    or exists (
      select 1 from public.devices d
      where (d.id = webrtc_signals.sender_device_id or d.id = webrtc_signals.target_device_id)
      and d.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.devices d
      where d.id = webrtc_signals.sender_device_id
      and d.owner_id = auth.uid()
    )
  );

alter publication supabase_realtime add table public.devices;
alter publication supabase_realtime add table public.device_access;
alter publication supabase_realtime add table public.cast_requests;
alter publication supabase_realtime add table public.cast_sessions;
alter publication supabase_realtime add table public.webrtc_signals;
