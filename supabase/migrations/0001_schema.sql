-- Kegel-App Schema
-- Enums
create type member_role as enum ('admin', 'kassenwart', 'mitglied');
create type evening_status as enum ('entwurf', 'kontrolle', 'freigegeben');
create type penalty_kat as enum ('pudel', 'c10', 'c50', 'c100');
create type verlauf_typ as enum ('strafe', 'sonstige', 'getraenke', 'beitrag', 'zahlung');

-- members: club members. user_id links to an auth account once the member signs in.
create table members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  avatar_url text,
  geburtstag text,               -- format "TT.MM"
  role member_role not null default 'mitglied',
  created_at timestamptz not null default now()
);

create table club_evenings (
  id uuid primary key default gen_random_uuid(),
  datum date not null,
  ort text,
  ersteller_id uuid references members(id) on delete set null,
  status evening_status not null default 'entwurf',
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create table attendance (
  evening_id uuid not null references club_evenings(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  anwesend boolean not null default true,
  primary key (evening_id, member_id)
);

create table penalties (
  id uuid primary key default gen_random_uuid(),
  evening_id uuid not null references club_evenings(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  kategorie penalty_kat not null,
  anzahl integer not null default 0 check (anzahl >= 0),
  unique (evening_id, member_id, kategorie)
);

create table sonstige_strafen (
  id uuid primary key default gen_random_uuid(),
  evening_id uuid not null references club_evenings(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  grund text not null,
  betrag numeric(10,2) not null default 0
);

create table evening_costs (
  evening_id uuid primary key references club_evenings(id) on delete cascade,
  kegelbahnkosten numeric(10,2) not null default 0,
  getraenkekosten numeric(10,2) not null default 0
);

create table championship_points (
  id uuid primary key default gen_random_uuid(),
  evening_id uuid not null references club_evenings(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  punkte integer not null default 0,
  unique (evening_id, member_id)
);

create table mitgliedsgebuehren (
  id uuid primary key default gen_random_uuid(),
  datum date not null,
  betrag numeric(10,2) not null,
  member_id uuid not null references members(id) on delete cascade
);

-- verlauf: per-member ledger. positive betrag raises the debt, negative lowers it.
create table verlauf (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  datum date not null,
  label text not null,
  betrag numeric(10,2) not null,
  typ verlauf_typ not null,
  evening_id uuid references club_evenings(id) on delete set null,
  created_at timestamptz not null default now()
);

create index verlauf_member_idx on verlauf (member_id, datum desc);
create index penalties_evening_idx on penalties (evening_id);
create index champ_evening_idx on championship_points (evening_id);

-- app-wide settings (single row): paypalme handle etc.
create table app_settings (
  id boolean primary key default true check (id),
  paypalme_handle text,
  termin_rhythmus_wochen integer not null default 4
);
insert into app_settings (id) values (true);

-- fixed price per penalty category
create or replace function price_for(kat penalty_kat)
returns numeric language sql immutable as $$
  select case kat
    when 'pudel' then 0.10
    when 'c10'   then 0.10
    when 'c50'   then 0.50
    when 'c100'  then 1.00
  end;
$$;
