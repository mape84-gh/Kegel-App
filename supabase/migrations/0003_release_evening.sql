-- release_evening(evening): roll an evening to 'freigegeben' and post ledger rows.
--  * absent members get the AVERAGE matrix penalty of present members (no lane/drinks)
--  * lane + drink costs split across present members only
--  * championship points kept for present members only
--  * every position becomes its own verlauf row, dated
--  * per-member total rounded UP to the full euro; the delta is booked as "Aufrundung"

create or replace function release_evening(p_evening uuid)
returns void
language plpgsql
security definer set search_path = public as $$
declare
  v_datum date;
  v_status evening_status;
  v_present int;
  v_matrix_total numeric := 0;
  v_avg numeric := 0;
  v_bahn numeric := 0;
  v_getr numeric := 0;
  v_bahn_share numeric := 0;
  v_getr_share numeric := 0;
  m record;
  s record;
  v_member_total numeric;
  v_matrix numeric;
  v_round_up numeric;
begin
  if not is_staff() then
    raise exception 'Nur Admin oder Kassenwart darf freigeben';
  end if;

  select datum, status into v_datum, v_status from club_evenings where id = p_evening;
  if v_datum is null then
    raise exception 'Abend % nicht gefunden', p_evening;
  end if;
  if v_status = 'freigegeben' then
    raise exception 'Abend ist bereits freigegeben';
  end if;

  select count(*) into v_present from attendance where evening_id = p_evening and anwesend;
  if v_present = 0 then
    raise exception 'Kein Anwesender erfasst';
  end if;

  select coalesce(sum(p.anzahl * price_for(p.kategorie)), 0)
    into v_matrix_total
  from penalties p
  join attendance a on a.evening_id = p.evening_id and a.member_id = p.member_id and a.anwesend
  where p.evening_id = p_evening;

  v_avg := round(v_matrix_total / v_present, 2);

  select coalesce(kegelbahnkosten,0), coalesce(getraenkekosten,0)
    into v_bahn, v_getr
  from evening_costs where evening_id = p_evening;
  v_bahn := coalesce(v_bahn,0);
  v_getr := coalesce(v_getr,0);
  v_bahn_share := round(v_bahn / v_present, 2);
  v_getr_share := round(v_getr / v_present, 2);

  delete from verlauf where evening_id = p_evening;

  for m in
    select a.member_id, a.anwesend from attendance a where a.evening_id = p_evening
  loop
    v_member_total := 0;

    if m.anwesend then
      select coalesce(sum(p.anzahl * price_for(p.kategorie)), 0) into v_matrix
      from penalties p where p.evening_id = p_evening and p.member_id = m.member_id;

      if v_matrix > 0 then
        insert into verlauf(member_id, datum, label, betrag, typ, evening_id)
        values (m.member_id, v_datum, 'Strafen vom ' || to_char(v_datum,'DD.MM.YYYY'), v_matrix, 'strafe', p_evening);
        v_member_total := v_member_total + v_matrix;
      end if;

      if v_bahn_share > 0 then
        insert into verlauf(member_id, datum, label, betrag, typ, evening_id)
        values (m.member_id, v_datum, 'Kegelbahnkosten', v_bahn_share, 'getraenke', p_evening);
        v_member_total := v_member_total + v_bahn_share;
      end if;
      if v_getr_share > 0 then
        insert into verlauf(member_id, datum, label, betrag, typ, evening_id)
        values (m.member_id, v_datum, 'Getränkekosten', v_getr_share, 'getraenke', p_evening);
        v_member_total := v_member_total + v_getr_share;
      end if;
    else
      if v_avg > 0 then
        insert into verlauf(member_id, datum, label, betrag, typ, evening_id)
        values (m.member_id, v_datum,
                'Ø-Strafe (abwesend am ' || to_char(v_datum,'DD.MM.YYYY') || ')',
                v_avg, 'strafe', p_evening);
        v_member_total := v_member_total + v_avg;
      end if;
      delete from championship_points where evening_id = p_evening and member_id = m.member_id;
    end if;

    for s in
      select grund, betrag from sonstige_strafen
      where evening_id = p_evening and member_id = m.member_id
    loop
      insert into verlauf(member_id, datum, label, betrag, typ, evening_id)
      values (m.member_id, v_datum, s.grund, s.betrag, 'sonstige', p_evening);
      v_member_total := v_member_total + s.betrag;
    end loop;

    v_round_up := ceil(v_member_total) - v_member_total;
    if v_round_up > 0 then
      insert into verlauf(member_id, datum, label, betrag, typ, evening_id)
      values (m.member_id, v_datum, 'Aufrundung', round(v_round_up,2), 'strafe', p_evening);
    end if;
  end loop;

  update club_evenings set status = 'freigegeben', released_at = now() where id = p_evening;
end;
$$;

revoke all on function release_evening(uuid) from public, anon;
grant execute on function release_evening(uuid) to authenticated;
