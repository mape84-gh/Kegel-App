import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import {
  rueckstandByMember,
  useAllPoints,
  useEvenings,
  useMembers,
  useSettings,
  useVerlauf,
} from '../lib/api'
import { daysUntil, fmtEuro, fmtLongDE, initials, nextBirthday } from '../lib/format'

export default function Home() {
  const nav = useNavigate()
  const { member } = useAuth()
  const evenings = useEvenings()
  const members = useMembers()
  const verlauf = useVerlauf()
  const points = useAllPoints()
  const settings = useSettings()
  const [payOpen, setPayOpen] = useState(false)

  const year = new Date().getFullYear()

  const nextEvening = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return (evenings.data ?? [])
      .filter((e) => e.datum >= today)
      .sort((a, b) => a.datum.localeCompare(b.datum))[0]
  }, [evenings.data])

  const kasse = useMemo(() => {
    // Näherung: Summe aller eingegangenen Zahlungen
    return (verlauf.data ?? [])
      .filter((v) => v.typ === 'zahlung')
      .reduce((s, v) => s + -Number(v.betrag), 0)
  }, [verlauf.data])

  const meinRueck = useMemo(() => {
    if (!member) return 0
    return rueckstandByMember(verlauf.data ?? [])[member.id] ?? 0
  }, [verlauf.data, member])

  const bday = useMemo(() => nextBirthday(members.data ?? []), [members.data])

  const top3 = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const p of points.data ?? []) {
      const d = p.club_evenings?.datum
      if (!d || new Date(d).getFullYear() !== year) continue
      acc[p.member_id] = (acc[p.member_id] ?? 0) + p.punkte
    }
    const byId = new Map((members.data ?? []).map((m) => [m.id, m.name]))
    return Object.entries(acc)
      .map(([id, pts]) => ({ id, name: byId.get(id) ?? '?', pts }))
      .sort((a, b) => b.pts - a.pts)
      .slice(0, 3)
  }, [points.data, members.data, year])

  const handle = settings.data?.paypalme_handle

  return (
    <>
      <div className="club-header">
        <button
          className="icon-btn club-header-btn"
          onClick={() => nav('/einstellungen')}
          aria-label="Einstellungen"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.24.58.78.98 1.42 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </button>
        <div className="club-logo-wrap">RS</div>
        <h1 className="club-title">Ratinger Skatschützen</h1>
      </div>

      <div className="hero">
        <div className="hero-label">Nächster Kegelabend</div>
        {nextEvening ? (
          <div className="hero-row">
            <div>
              <div className="hero-date">{fmtLongDE(nextEvening.datum)}</div>
              {nextEvening.ort && <div className="hero-sub">{nextEvening.ort}</div>}
            </div>
            <div className="flip-number">
              {(() => {
                const d = daysUntil(nextEvening.datum)
                return d === 0 ? 'heute' : `${d} T`
              })()}
            </div>
          </div>
        ) : (
          <div className="hero-sub">Noch kein Termin geplant</div>
        )}
      </div>

      <div className="tile-grid">
        <div className="tile">
          <div className="value green">{fmtEuro(kasse)} €</div>
          <div className="label">Kassenbestand</div>
        </div>
        <div
          className="tile"
          onClick={() => setPayOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          <div className={'value ' + (meinRueck > 0 ? 'red' : 'green')}>
            {fmtEuro(meinRueck)} €
          </div>
          <div className="label">Mein Rückstand</div>
        </div>
        <div className="tile">
          <div className="value">{bday ? bday.member.name : '–'}</div>
          <div className="label">
            {bday
              ? bday.date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
              : 'Nächster Geburtstag'}
          </div>
        </div>
        <div
          className="tile"
          onClick={() => nav('/meisterschaft')}
          style={{ cursor: 'pointer' }}
        >
          <div className="value amber">{year}</div>
          <div className="label">Meisterschaft ansehen</div>
        </div>
      </div>

      <div className="section-title">
        <h2>Meisterschaft Top 3</h2>
        <a onClick={() => nav('/meisterschaft')}>Alle</a>
      </div>
      <div className="mini-podium">
        {top3.length === 0 && <div className="center-note">Noch keine Punkte {year}</div>}
        {top3.map((m, i) => (
          <div className="mp-card" key={m.id}>
            <div className="mp-rank">{i + 1}.</div>
            <div className="mp-avatar">{initials(m.name)}</div>
            <div className="mp-name">{m.name}</div>
            <div className="mp-pts">{m.pts}</div>
          </div>
        ))}
      </div>

      {payOpen && (
        <div className="confirm-overlay" onClick={() => setPayOpen(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3>Rückstand begleichen</h3>
            <p>
              {meinRueck > 0
                ? `Dein aktueller Rückstand beträgt ${fmtEuro(meinRueck)} €.`
                : 'Du hast aktuell keinen Rückstand.'}
              {!handle && ' Es ist noch kein PayPalMe-Handle hinterlegt.'}
            </p>
            <div className="confirm-buttons">
              <button onClick={() => setPayOpen(false)}>Schließen</button>
              <button
                disabled={!handle}
                onClick={() => {
                  const betrag = meinRueck > 0 ? meinRueck.toFixed(2) : ''
                  window.open(
                    `https://paypal.me/${handle}${betrag ? '/' + betrag : ''}`,
                    '_blank',
                  )
                  setPayOpen(false)
                }}
              >
                zu PayPal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
