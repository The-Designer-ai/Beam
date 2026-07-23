revoke execute on function public.create_device_invite(uuid) from public, anon;
revoke execute on function public.redeem_device_invite(text) from public, anon;
revoke execute on function public.list_saved_devices(uuid) from public, anon;

grant execute on function public.create_device_invite(uuid) to authenticated;
grant execute on function public.redeem_device_invite(text) to authenticated;
grant execute on function public.list_saved_devices(uuid) to authenticated;

drop policy if exists "push receipts are server only" on public.push_delivery_receipts;
create policy "push receipts are server only" on public.push_delivery_receipts
  for all to authenticated
  using (false)
  with check (false);

create index if not exists cast_diagnostics_user_id_idx
  on public.cast_diagnostics(user_id);
create index if not exists cast_diagnostics_request_id_idx
  on public.cast_diagnostics(request_id);
create index if not exists cast_diagnostics_device_id_idx
  on public.cast_diagnostics(device_id);
create index if not exists push_delivery_receipts_device_id_idx
  on public.push_delivery_receipts(device_id);
