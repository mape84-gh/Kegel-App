-- Club-level cash movements (not tied to a member): the "Umsätze" tab.
create table club_transactions (
  id uuid primary key default gen_random_uuid(),
  datum date not null,
  bezeichnung text not null,
  einnahmen numeric(10,2) not null default 0,
  ausgaben numeric(10,2) not null default 0,
  created_by uuid references members(id) on delete set null,
  created_at timestamptz not null default now()
);
create index club_tx_datum_idx on club_transactions (datum desc);

alter table club_transactions enable row level security;
create policy read_all_club_tx   on club_transactions for select to authenticated using (true);
create policy staff_write_club_tx on club_transactions for all to authenticated using (is_staff()) with check (is_staff());
