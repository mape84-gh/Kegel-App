-- Role helpers + Row Level Security

create or replace function auth_member_role()
returns member_role
language sql stable security definer set search_path = public as $$
  select role from members where user_id = auth.uid() limit 1;
$$;

create or replace function is_staff()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth_member_role() in ('admin','kassenwart'), false);
$$;

create or replace function is_admin()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth_member_role() = 'admin', false);
$$;

alter table members enable row level security;
alter table club_evenings enable row level security;
alter table attendance enable row level security;
alter table penalties enable row level security;
alter table sonstige_strafen enable row level security;
alter table evening_costs enable row level security;
alter table championship_points enable row level security;
alter table mitgliedsgebuehren enable row level security;
alter table verlauf enable row level security;
alter table app_settings enable row level security;

-- everyone signed in can read everything (incl. own Verlauf)
create policy read_all_members        on members            for select to authenticated using (true);
create policy read_all_evenings       on club_evenings      for select to authenticated using (true);
create policy read_all_attendance     on attendance         for select to authenticated using (true);
create policy read_all_penalties      on penalties          for select to authenticated using (true);
create policy read_all_sonstige       on sonstige_strafen   for select to authenticated using (true);
create policy read_all_costs          on evening_costs      for select to authenticated using (true);
create policy read_all_champ          on championship_points for select to authenticated using (true);
create policy read_all_gebuehren      on mitgliedsgebuehren for select to authenticated using (true);
create policy read_all_verlauf        on verlauf            for select to authenticated using (true);
create policy read_all_settings       on app_settings       for select to authenticated using (true);

-- staff (admin + kassenwart) write evening + finance data
create policy staff_write_evenings    on club_evenings      for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_write_attendance  on attendance         for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_write_penalties   on penalties          for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_write_sonstige    on sonstige_strafen   for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_write_costs       on evening_costs      for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_write_champ       on championship_points for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_write_gebuehren   on mitgliedsgebuehren for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_write_verlauf     on verlauf            for all to authenticated using (is_staff()) with check (is_staff());
create policy staff_write_settings    on app_settings       for all to authenticated using (is_staff()) with check (is_staff());

-- roster: admin manages. Self-onboarding is handled by claim_member() in 0005.
create policy admin_write_members     on members            for all to authenticated using (is_admin()) with check (is_admin());

revoke all on function auth_member_role() from anon;
revoke all on function is_staff() from anon;
revoke all on function is_admin() from anon;
