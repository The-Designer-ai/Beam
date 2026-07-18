drop policy if exists "device access request by authenticated user" on public.device_access;
drop policy if exists "device access update by owner or grantee" on public.device_access;
drop policy if exists "device access update by device owner" on public.device_access;
drop policy if exists "device access removal by related user" on public.device_access;

create policy "device access update by device owner" on public.device_access
  for update using (
    exists (
      select 1 from public.devices d
      where d.id = device_access.device_id
      and d.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.devices d
      where d.id = device_access.device_id
      and d.owner_id = auth.uid()
    )
  );

create policy "device access removal by related user" on public.device_access
  for delete using (
    grantee_user_id = auth.uid()
    or exists (
      select 1 from public.devices d
      where d.id = device_access.device_id
      and d.owner_id = auth.uid()
    )
  );

create or replace function public.create_device_invite(p_target_device_id uuid)
returns table(code text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_code text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1 from public.devices
    where id = p_target_device_id
    and owner_id = auth.uid()
  ) then
    raise exception 'You can only invite people to your own device';
  end if;

  update public.device_invites
  set status = 'expired'
  where created_by = auth.uid()
    and target_device_id = p_target_device_id
    and status = 'pending';

  loop
    v_code := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    begin
      insert into public.device_invites (code, created_by, target_device_id)
      values (v_code, auth.uid(), p_target_device_id)
      returning device_invites.expires_at into v_expires_at;
      exit;
    exception when unique_violation then
      null;
    end;
  end loop;

  return query select v_code, v_expires_at;
end;
$$;

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
  on conflict (device_id, grantee_user_id) do update
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

revoke all on function public.create_device_invite(uuid) from public;
revoke all on function public.redeem_device_invite(text) from public;
grant execute on function public.create_device_invite(uuid) to authenticated;
grant execute on function public.redeem_device_invite(text) to authenticated;
