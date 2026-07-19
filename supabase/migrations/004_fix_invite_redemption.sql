create or replace function public.redeem_device_invite(p_code text)
returns table(device_id uuid, device_name text, device_type text, owner_id uuid)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_invite public.device_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_invite
  from public.device_invites
  where code = upper(trim(p_code))
  for update;

  if not found then
    raise exception 'Invite code not found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invite code has already been used or cancelled';
  end if;

  if v_invite.expires_at <= now() then
    update public.device_invites set status = 'expired' where id = v_invite.id;
    raise exception 'Invite code has expired';
  end if;

  if v_invite.target_device_id is null then
    raise exception 'Invite has no device attached';
  end if;

  if v_invite.created_by = auth.uid() then
    raise exception 'Your own devices are already available to your account';
  end if;

  insert into public.device_access (
    device_id,
    grantee_user_id,
    status,
    created_by,
    updated_at
  ) values (
    v_invite.target_device_id,
    auth.uid(),
    'approved',
    v_invite.created_by,
    now()
  )
  on conflict on constraint device_access_device_id_grantee_user_id_key do update
  set status = 'approved',
      created_by = excluded.created_by,
      updated_at = now();

  update public.device_invites
  set status = 'accepted'
  where id = v_invite.id;

  return query
  select d.id, d.name, d.type, d.owner_id
  from public.devices d
  where d.id = v_invite.target_device_id;
end;
$$;

revoke all on function public.redeem_device_invite(text) from public;
grant execute on function public.redeem_device_invite(text) to authenticated;
