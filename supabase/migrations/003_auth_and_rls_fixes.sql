create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.owns_device(p_device_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.devices d
    where d.id = p_device_id
      and d.owner_id = (select auth.uid())
  );
$$;

create or replace function private.can_access_device(p_device_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.devices d
    where d.id = p_device_id
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
  );
$$;

revoke all on function private.owns_device(uuid) from public;
revoke all on function private.can_access_device(uuid) from public;
grant execute on function private.owns_device(uuid) to authenticated;
grant execute on function private.can_access_device(uuid) to authenticated;

drop policy if exists "devices visible to owner or approved users" on public.devices;
create policy "devices visible to owner or approved users" on public.devices
  for select to authenticated
  using ((select private.can_access_device(id)));

drop policy if exists "device access visible to related users" on public.device_access;
create policy "device access visible to related users" on public.device_access
  for select to authenticated
  using (
    grantee_user_id = (select auth.uid())
    or created_by = (select auth.uid())
    or (select private.owns_device(device_id))
  );

drop policy if exists "device access update by owner or grantee" on public.device_access;
drop policy if exists "device access update by device owner" on public.device_access;
create policy "device access update by device owner" on public.device_access
  for update to authenticated
  using ((select private.owns_device(device_id)))
  with check ((select private.owns_device(device_id)));

drop policy if exists "device access removal by related user" on public.device_access;
create policy "device access removal by related user" on public.device_access
  for delete to authenticated
  using (
    grantee_user_id = (select auth.uid())
    or (select private.owns_device(device_id))
  );

drop policy if exists "cast requests related users" on public.cast_requests;
drop policy if exists "cast requests visible to related users" on public.cast_requests;
drop policy if exists "cast requests created by authorized sender" on public.cast_requests;
drop policy if exists "cast requests updated by related users" on public.cast_requests;
drop policy if exists "cast requests deleted by sender" on public.cast_requests;
create policy "cast requests visible to related users" on public.cast_requests
  for select to authenticated
  using (
    sender_user_id = (select auth.uid())
    or (select private.owns_device(receiver_device_id))
  );

create policy "cast requests created by authorized sender" on public.cast_requests
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and (
      (select private.owns_device(receiver_device_id))
      or (select private.can_access_device(receiver_device_id))
    )
  );

create policy "cast requests updated by related users" on public.cast_requests
  for update to authenticated
  using (
    sender_user_id = (select auth.uid())
    or (select private.owns_device(receiver_device_id))
  )
  with check (
    sender_user_id = (select auth.uid())
    or (select private.owns_device(receiver_device_id))
  );

create policy "cast requests deleted by sender" on public.cast_requests
  for delete to authenticated
  using (sender_user_id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_domain text;
begin
  v_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'User'
  );
  v_domain := '@' || coalesce(
    nullif(regexp_replace(lower(v_display_name), '[^a-z0-9]+', '', 'g'), ''),
    'user'
  );

  insert into public.profiles (id, email, display_name, domain)
  values (new.id, coalesce(new.email, ''), v_display_name, v_domain)
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      domain = excluded.domain,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

insert into public.profiles (id, email, display_name, domain)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
    'User'
  ),
  '@' || coalesce(
    nullif(
      regexp_replace(
        lower(coalesce(
          nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
          nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
          'user'
        )),
        '[^a-z0-9]+',
        '',
        'g'
      ),
      ''
    ),
    'user'
  )
from auth.users u
on conflict (id) do nothing;
