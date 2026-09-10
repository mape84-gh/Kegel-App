# Kegelclub-App – Ratinger Skatschützen

Ersetzt die bisherige „ClubmanagerApp". Mobile-first PWA für Kegelabende,
Strafen, Finanzen und Meisterschaft.

## Stack

- **Live:** https://kegel-app.netlify.app (Auto-Deploy bei Push auf `main`)
- **Frontend:** React + Vite + TypeScript, gehostet auf Netlify
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- Projekt-Ref: `tqpzxtngypqjbaejsfjp` · Region `eu-central-1`

Netlify-Env-Variablen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
Nach dem ersten Deploy in Supabase → Authentication → URL Configuration die
Netlify-URL als *Site URL* und *Redirect URL* eintragen.

## Lokale Entwicklung

```bash
npm install
cp .env.example .env   # Werte eintragen (siehe unten)
npm run dev
```

`.env`:

```
VITE_SUPABASE_URL=https://tqpzxtngypqjbaejsfjp.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...
```

Die publishable Keys stehen im Supabase-Dashboard unter *Project Settings → API*.

## Datenbank

SQL-Migrationen liegen in `supabase/migrations/` und sind bereits auf das
Remote-Projekt angewendet. Reihenfolge:

| Datei | Inhalt |
|---|---|
| `0001_schema.sql` | Tabellen, Enums, `price_for()` |
| `0002_rls.sql` | Rollen-Helper + Row Level Security |
| `0003_release_evening.sql` | Freigabe-Funktion (Ø-Strafe, Kostenteilung, Aufrundung, Ledger) |
| `0004_seed_members.sql` | Start-Mitgliederliste |

### Rollen

| Rolle | Abende erfassen | Finanzen | Lesen |
|---|---|---|---|
| `admin` | ✅ | ✅ | alles |
| `kassenwart` | ✅ | ✅ | alles |
| `mitglied` | ❌ | ❌ | alles (inkl. eigener Verlauf) |

Durchsetzung serverseitig über RLS (`is_staff()` / `is_admin()`), nicht nur im Frontend.

## Deployment (Netlify)

1. Repo mit Netlify verbinden (Auto-Deploy bei Push).
2. Build-Settings: kommen aus `netlify.toml` (`npm run build` → `dist`).
3. Environment-Variablen in Netlify setzen: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## Domain `kegelapp.dm-cloud.de`

Bei hosting.de einen **CNAME** anlegen:

```
kegelapp.dm-cloud.de.  CNAME  <dein-site-name>.netlify.app.
```

Danach in Netlify unter *Domain management* die Custom Domain hinzufügen; das
TLS-Zertifikat stellt Netlify automatisch aus.

## Noch offen (siehe Übergabe-Doc)

WhatsApp-Export, Jahresrückblick-Bild, Abend-Podium-Export, wiederkehrender
Terminvorschlag, volle ST-Spieltag-Tabelle.
