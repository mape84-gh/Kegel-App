import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import {
  useAllAttendance,
  useAllPoints,
  useCreateEvening,
  useEvenings,
  useMembers,
  useSettings,
  useVerlauf,
} from '../lib/api'
import { fmtEuro, fmtLongDE, initials } from '../lib/format'
import { drawEveningPodium } from '../lib/canvasCards'
import { shareCanvas } from '../lib/share'

const STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  kontrolle: 'Kontrolle',
  freigegeben: 'Freigegeben',
}

function addWeeks(iso: string, weeks: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

export default function Abende() {
  const nav = useNavigate()
  const { isStaff, member } = useAuth()
  const evenings = useEvenings()
  const attendance = useAllAttendance()
  const verlauf = useVerlauf()
  const points = useAllPoints()
  const members = useMembers()
  const settings = useSettings()
  const create = useCreateEvening()
  const [year, setYear] = useState<number | 'alle'>(new Date().getFullYear())
  const [podiumFor, setPodiumFor] = useState<string | null>(null)
  const [sharing, setSharing] = useState(false)

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    const s = new Set<number>([now, now - 1])
    for (const e of evenings.data ?? []) s.add(Number(e.datum.slice(0, 4)))
    return [...s].sort((a, b) => b - a)
  }, [evenings.data])

  const list = useMemo(() => {
    const all = evenings.data ?? []
    if (year === 'alle') return all
    return all.filter((e) => Number(e.datum.slice(0, 4)) === year)
  }, [evenings.data, year])

  const teilnehmer = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const a of attendance.data ?? []) {
      if (a.anwesend) acc[a.evening_id] = (acc[a.evening_id] ?? 0) + 1
    }
    return acc
  }, [attendance.data])

  const einnahmen = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const v of verlauf.data ?? []) {
      if (!v.evening_id) continue
      if (v.typ === 'strafe' || v.typ === 'sonstige' || v.typ === 'getraenke') {
        acc[v.evening_id] = (acc[v.evening_id] ?? 0) + Number(v.betrag)
      }
    }
    return acc
  }, [verlauf.data])

  // --- recurring date suggestion (open point #5) ---
  const rhythmus = settings.data?.termin_rhythmus_wochen ?? 4
  const today = new Date().toISOString().slice(0, 10)
  const hasFuture = (evenings.data ?? []).some((e) => e.datum >= today)
  const vorschlag = useMemo(() => {
    if (hasFuture) return null
    const last = (evenings.data ?? [])
      .map((e) => e.datum)
      .sort()
      .at(-1)
    let d = last ? addWeeks(last, rhythmus) : addWeeks(today, rhythmus)
    let guard = 0
    while (d <= today && guard++ < 60) d = addWeeks(d, rhythmus)
    return d
  }, [evenings.data, hasFuture, rhythmus, today])

  async function newEvening(datum: string) {
    const ev = await create.mutateAsync({ datum, ersteller_id: member?.id ?? null })
    nav(`/abende/${ev.id}`)
  }

  const podiumEvening = (evenings.data ?? []).find((e) => e.id === podiumFor)
  const podiumTop3 = useMemo(() => {
    if (!podiumFor) return []
    const byId = new Map((members.data ?? []).map((m) => [m.id, m.name]))
    return (points.data ?? [])
      .filter((p) => p.evening_id === podiumFor)
      .map((p) => ({ name: byId.get(p.member_id) ?? '?', value: p.punkte }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
  }, [podiumFor, points.data, members.data])

  return (
    <>
      <div className="topbar">
        <h1>Kegelabende</h1>
        {isStaff && (
          <button
            className="icon-btn"
            onClick={() => newEvening(today)}
            disabled={create.isPending}
          >
            ＋
          </button>
        )}
      </div>

      <div className="chip-row">
        {years.map((y) => (
          <button
            key={y}
            className={'chip' + (year === y ? ' active' : '')}
            onClick={() => setYear(y)}
          >
            {y}
          </button>
        ))}
        <button
          className={'chip' + (year === 'alle' ? ' active' : '')}
          onClick={() => setYear('alle')}
        >
          Alle
        </button>
      </div>

      {isStaff && vorschlag && (
        <div className="list-pad">
          <div className="card">
            <div className="p-label">Nächster Termin-Vorschlag</div>
            <div className="p-sub" style={{ marginBottom: 10 }}>
              {fmtLongDE(vorschlag)} · Rhythmus alle {rhythmus} Wochen
            </div>
            <button
              className="mgb-row"
              style={{ width: '100%' }}
              onClick={() => newEvening(vorschlag)}
              disabled={create.isPending}
            >
              <span
                style={{
                  flex: 1,
                  background: 'var(--amber)',
                  color: '#fff',
                  borderRadius: 10,
                  padding: '10px 0',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                Diesen Termin anlegen
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="list-pad">
        {evenings.isLoading && <div className="center-note">Lädt…</div>}
        {!evenings.isLoading && list.length === 0 && (
          <div className="center-note">Keine Abende in diesem Zeitraum</div>
        )}
        {list.map((e) => {
          const released = e.status === 'freigegeben'
          const onClick = released
            ? () => setPodiumFor(e.id)
            : isStaff
              ? () => nav(`/abende/${e.id}`)
              : undefined
          return (
            <div
              key={e.id}
              className="card abend-card"
              onClick={onClick}
              style={{ cursor: onClick ? 'pointer' : 'default' }}
            >
              <div className="abend-left">
                <div className="d1">
                  {fmtLongDE(e.datum)}
                  {released && <span className="status-dot ok" />}
                </div>
                <div className="d2">
                  {released ? `${teilnehmer[e.id] ?? 0} Teilnehmer` : e.ort || 'Kegelbahn'}
                </div>
              </div>
              <div className="abend-right">
                {released ? (
                  <>
                    <div className="amt num">{fmtEuro(einnahmen[e.id] ?? 0)} €</div>
                    <div className="d2">Einnahmen</div>
                  </>
                ) : (
                  <span className={'status-chip ' + e.status}>{STATUS_LABEL[e.status]}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {podiumFor && podiumEvening && (
        <div className="modal-overlay" onClick={() => setPodiumFor(null)}>
          <div className="modal-sheet" onClick={(ev) => ev.stopPropagation()}>
            <div className="modal-top">
              <span className="modal-name">{fmtLongDE(podiumEvening.datum)}</span>
              <button className="modal-close" onClick={() => setPodiumFor(null)}>
                Fertig
              </button>
            </div>
            <div className="modal-section-label">
              Podium des Abends · nach Meisterschaftspunkten
            </div>
            {podiumTop3.length === 0 ? (
              <div className="verlauf-empty">Für diesen Abend wurden keine Punkte erfasst</div>
            ) : (
              <div className="podium">
                {[podiumTop3[1], podiumTop3[0], podiumTop3[2]].map((p, i) => (
                  <div className={'p-slot ' + ['silver', 'gold', 'bronze'][i]} key={i}>
                    <div className="p-avatar">{p ? initials(p.name) : '—'}</div>
                    <div className="p-name">{p?.name ?? '—'}</div>
                    <div className="p-bar">
                      <div className="flip-number">{p ? p.value : ''}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>{p ? 'Pkt' : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-pay">
              <button
                style={{ flex: 1 }}
                disabled={sharing || podiumTop3.length === 0}
                onClick={async () => {
                  setSharing(true)
                  try {
                    const canvas = drawEveningPodium(fmtLongDE(podiumEvening.datum), podiumTop3)
                    await shareCanvas(
                      canvas,
                      `podium-${podiumEvening.datum}.png`,
                      'Abend-Podium',
                    )
                  } finally {
                    setSharing(false)
                  }
                }}
              >
                {sharing ? 'Erzeuge Bild…' : 'Als Bild teilen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
