-- Demo data helpers (staff only): fill every screen with released evenings, or
-- wipe everything but the roster. Mirrors the HTML prototype's generated season.

create or replace function wipe_demo_data()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'Nur Admin oder Kassenwart'; end if;
  delete from verlauf;
  delete from mitgliedsgebuehren;
  delete from club_evenings;  -- cascades attendance/penalties/sonstige/costs/points
  update members set role = 'mitglied' where name <> 'Marcel';
end;
$$;

create or replace function seed_demo_data()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_dates date[] := array[
    date '2025-09-24', date '2025-10-22', date '2025-11-19',
    date '2026-06-10', date '2026-07-08', date '2026-08-05'
  ];
  v_d date;
  v_ev uuid;
  m record;
  seed int;
  i int := 0;
  present boolean;
begin
  if not is_staff() then raise exception 'Nur Admin oder Kassenwart'; end if;

  perform wipe_demo_data();
  update members set role = 'kassenwart' where name = 'DOC';
  update members set role = 'admin' where name = 'Graf Zahl';

  foreach v_d in array v_dates loop
    i := i + 1;
    insert into club_evenings(datum, ort, status)
      values (v_d, 'Kegelbahn', 'entwurf') returning id into v_ev;
    insert into evening_costs(evening_id, kegelbahnkosten, getraenkekosten)
      values (v_ev, 5 + (i % 3), 20 + (i * 7) % 25);

    for m in select id, row_number() over (order by name) as rn from members loop
      seed := (i * 100 + m.rn * 7);
      present := (seed % 100) < 85;
      insert into attendance(evening_id, member_id, anwesend) values (v_ev, m.id, present);
      if present then
        insert into penalties(evening_id, member_id, kategorie, anzahl) values
          (v_ev, m.id, 'pudel', (seed * 3) % 4),
          (v_ev, m.id, 'c10',   (seed * 5) % 5),
          (v_ev, m.id, 'c50',   (seed * 2) % 3),
          (v_ev, m.id, 'c100',  (seed) % 2);
        insert into championship_points(evening_id, member_id, punkte)
          values (v_ev, m.id, (seed * 11) % 9);
        if (seed % 7) = 0 then
          insert into sonstige_strafen(evening_id, member_id, grund, betrag)
            values (v_ev, m.id, 'Pin vergessen', 5);
        end if;
      end if;
    end loop;

    perform release_evening(v_ev);
  end loop;

  insert into mitgliedsgebuehren(datum, betrag, member_id)
    select date '2026-01-15', 30, id from members;
  insert into verlauf(member_id, datum, label, betrag, typ)
    select id, date '2026-01-15', 'Mitgliedsbeitrag 2026', 30, 'beitrag' from members;
  insert into verlauf(member_id, datum, label, betrag, typ)
    select id, date '2026-08-10', 'Zahlung', -20, 'zahlung'
    from members where name in ('Marcel', 'DOC', 'Laser', 'Mogli');
end;
$$;

revoke all on function seed_demo_data() from public, anon;
revoke all on function wipe_demo_data() from public, anon;
grant execute on function seed_demo_data() to authenticated;
grant execute on function wipe_demo_data() to authenticated;
