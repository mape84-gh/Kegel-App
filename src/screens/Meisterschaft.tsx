import { useMemo, useState } from 'react'
import { useAllPoints, useEvenings, useMembers } from '../lib/api'
import { initials } from '../lib/format'

export default function Meisterschaft() {
  const points = useAllPoints()
  const members = useMembers()
  const evenings = useEvenings()
  const [year, setYear] = useState(new Date().getFullYear())

  const eveningsInYear = useMemo(
    () =>
      (evenings.data ?? []).filter(
        (e) => e.status === 'freigegeben' && Number(e.datum.slice(0, 4)) === year,
      ).length,
    [evenings.data, year],
  )

  const years = useMemo(() => {
    const s = new Set<number>([new Date().getFullYear()])
    for (const p of points.data ?? []) {
      if (p.club_evenings?.datum) s.add(Number(p.club_evenings.datum.slice(0, 4)))
    }
    return [...s].sort((a, b) => b - a)
  }, [points.data])

  const ranking = useMemo(() => {
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
  }, [points.data, members.data, year])

  const podium = ranking.slice(0, 3)
  const slots = ['silver', 'gold', 'bronze'] as const
  const order = [podium[1], podium[0], podium[2]]

  return (
    <>
      <div className="topbar">
        <h1>Meisterschaft {year}</h1>
      </div>

      <div className="chip-row">
        {years.map((y) => (
          <button key={y} className={'chip' + (y === year ? ' active' : '')} onClick={() => setYear(y)}>
            {y}
          </button>
        ))}
      </div>

      {ranking.length === 0 ? (
        <div className="center-note">Noch keine Punkte in {year}</div>
      ) : (
        <>
          <div className="podium">
            {order.map((p, i) =>
              p ? (
                <div className={'p-slot ' + slots[i]} key={p.id}>
                  <div className="p-avatar">{initials(p.name)}</div>
                  <div className="p-name">{p.name}</div>
                  <div className="p-bar">
                    <div className="flip-number">{p.pts}</div>
                  </div>
                </div>
              ) : (
                <div className={'p-slot ' + slots[i]} key={i} />
              ),
            )}
          </div>

          <div>
            {ranking.map((p, i) => (
              <div className="rank-row" key={p.id}>
                <div className="rank-num">{i + 1}</div>
                <div className="rank-avatar">{initials(p.name)}</div>
                <div className="rank-name">{p.name}</div>
                <div style={{ textAlign: 'right' }}>
                  <div className="rank-pts">{p.pts} Pkt</div>
                  <div className="rank-schnitt">
                    Ø {(eveningsInYear ? p.pts / eveningsInYear : 0).toFixed(1)} / Abend
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
