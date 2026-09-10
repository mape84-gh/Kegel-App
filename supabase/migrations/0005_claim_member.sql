-- Onboarding: let a signed-in user link an UNCLAIMED member row to their login,
-- without being able to change name/role. Supersedes the self_claim_member policy.
drop policy if exists self_claim_member on members;

create or replace function claim_member(p_member uuid)
returns void
language plpgsql
security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet';
  end if;
  if exists (select 1 from members where user_id = auth.uid()) then
    raise exception 'Dieser Login ist bereits einem Mitglied zugeordnet';
  end if;
  update members set user_id = auth.uid()
   where id = p_member and user_id is null;
  if not found then
    raise exception 'Mitglied nicht gefunden oder bereits vergeben';
  end if;
end;
$$;

revoke all on function claim_member(uuid) from public, anon;
grant execute on function claim_member(uuid) to authenticated;
