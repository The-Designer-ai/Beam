create or replace function public.list_saved_devices(p_current_device_id uuid)
returns table(
  device_id uuid,
  device_owner_id uuid,
  device_name text,
  device_type text,
  device_push_token text,
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
    d.push_token,
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
