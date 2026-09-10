import { useMemo, useState } from 'react'
import { useAllAttendance, useAllPenalties, useMembers, useVerlauf } from '../lib/api'
import { fmtEuro, initials } from '../lib/format'

type Period = 'kalenderjahr' | 'custom'

export default function Statistik() {
  const members = useMembers()
  const verlauf = useVerlauf()
  const penalties = useAllPenalties()
  const attendance = useAllAttendance()

  const [period, setPeriod] = useState<Period>('kalenderjahr')
  const now = new Date()
  const [from, setFrom] = useState(`${now.getFullYear()}-01-01`)
  const [to, setTo] = useState(now.toISOString().slice(0, 10))

  const range = useMemo(() => {
    if (period === 'kalenderjahr') {
      return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` }
    }
    return { from, to }
  }, [period, from, to, now])

  const inRange = (d?: string | null) => !!d && d >= range.from && d <= range.to

  const byId = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m.name])),
    [members.data],
  )

  function toList(acc: Record<string, number>, unit: string) {
    return Object.entries(acc)
      .map(([id, value]) => ({ id, name: byId.get(id) ?? '?', value }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((x) => ({ ...x, display: unit === '€' ? `${fmtEuro(x.value)} €` : String(x.value) }))
  }

  const strafen = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const v of verlauf.data ?? []) {
      if (!inRange(v.datum)) continue
      if (v.typ === 'strafe' || v.typ === 'sonstige') {
        acc[v.member_id] = (acc[v.member_id] ?? 0) + Number(v.betrag)
      }
    }
    return toList(acc, '€')
  }, [verlauf.data, range])

  const pudel = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const p of penalties.data ?? []) {
      if (p.kategorie !== 'pudel') continue
      if (p.club_evenings?.status !== 'freigegeben') continue
      if (!inRange(p.club_evenings?.datum)) continue
      acc[p.member_id] = (acc[p.member_id] ?? 0) + p.anzahl
    }
    return toList(acc, 'x')
  }, [penalties.data, range])

  const anwesend = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const a of attendance.data ?? []) {
      if (a.club_evenings?.status !== 'freigegeben') continue
      if (!inRange(a.club_evenings?.datum)) continue
      if (a.anwesend) acc[a.member_id] = (acc[a.member_id] ?? 0) + 1
    }
    return toList(acc, 'x')
  }, [attendance.data, range])

  const fehl = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const a of attendance.data ?? []) {
      if (a.club_evenings?.status !== 'freigegeben') continue
      if (!inRange(a.club_evenings?.datum)) continue
      if (!a.anwesend) acc[a.member_id] = (acc[a.member_id] ?? 0) + 1
    }
    return toList(acc, 'x')
  }, [attendance.data, range])

  const abendeInRange = useMemo(
    () =>
      (attendance.data ?? []).reduce((set, a) => {
        if (a.club_evenings?.status === 'freigegeben' && inRange(a.club_evenings?.datum))
          set.add(a.evening_id)
        return set
      }, new Set<string>()).size,
    [attendance.data, range],
  )

  const blocks: { title: string; data: ReturnType<typeof toList> }[] = [
    { title: '💸 Meiste Strafen', data: strafen },
    { title: '🎳 Meiste Pudel', data: pudel },
    { title: '✅ Meiste Anwesenheiten', data: anwesend },
    { title: '❌ Meiste Fehlzeiten', data: fehl },
  ]

  return (
    <>
      <div className="topbar">
        <h1>Statistik</h1>
      </div>

      <div className="chip-row">
        <button
          className={'chip' + (period === 'kalenderjahr' ? ' active' : '')}
          onClick={() => setPeriod('kalenderjahr')}
        >
          Kalenderjahr
        </button>
        <button
          className={'chip' + (period === 'custom' ? ' active' : '')}
          onClick={() => setPeriod('custom')}
        >
          Eigener Zeitraum
        </button>
      </div>
      {period === 'custom' && (
        <div className="period-custom">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span style={{ color: 'var(--muted)' }}>bis</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      )}

      <div className="center-note" style={{ padding: '0 16px 10px' }}>
        {range.from.split('-').reverse().join('.')} – {range.to.split('-').reverse().join('.')} ·{' '}
        {abendeInRange} Kegelabende im Zeitraum
      </div>

      {blocks.map((b) => (
        <div className="stat-block" key={b.title}>
          <div className="section-title">
            <h2>{b.title}</h2>
          </div>
          {b.data.length === 0 ? (
            <div className="verlauf-empty">Keine Daten im Zeitraum</div>
          ) : (
            b.data.map((x, i) => (
              <div className="rank-row" key={x.id}>
                <div className="rank-num">{i + 1}</div>
                <div className="rank-avatar">{initials(x.name)}</div>
                <div className="rank-name">{x.name}</div>
                <div className="rank-pts">{x.display}</div>
              </div>
            ))
          )}
        </div>
      ))}
    </>
  )
}
