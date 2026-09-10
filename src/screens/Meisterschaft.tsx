import { useMemo, useState } from 'react'
import {
  useAllAttendance,
  useAllPenalties,
  useAllPoints,
  useEvenings,
  useMembers,
  useVerlauf,
} from '../lib/api'
import { fmtEuro, initials } from '../lib/format'
import { drawYearReview, type ReviewRow } from '../lib/canvasCards'
import { shareCanvas } from '../lib/share'
import { useToast } from '../components/Toast'

export default function Meisterschaft() {
  const toast = useToast()
  const points = useAllPoints()
  const members = useMembers()
  const evenings = useEvenings()
  const penalties = useAllPenalties()
  const attendance = useAllAttendance()
  const verlauf = useVerlauf()
  const [year, setYear] = useState(new Date().getFullYear())
  const [sharing, setSharing] = useState(false)

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

  const byId = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m.name])),
    [members.data],
  )

  const ranking = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const p of points.data ?? []) {
      const d = p.club_evenings?.datum
      if (!d || Number(d.slice(0, 4)) !== year) continue
      acc[p.member_id] = (acc[p.member_id] ?? 0) + p.punkte
    }
    return Object.entries(acc)
      .map(([id, pts]) => ({ id, name: byId.get(id) ?? '?', pts }))
      .sort((a, b) => b.pts - a.pts)
  }, [points.data, byId, year])

  const podium = ranking.slice(0, 3)
  const slots = ['silver', 'gold', 'bronze'] as const
  const order = [podium[1], podium[0], podium[2]]

  function buildReview(): ReviewRow[] {
    const inY = (d?: string | null) => !!d && Number(d.slice(0, 4)) === year

    const pudel: Record<string, number> = {}
    for (const p of penalties.data ?? []) {
      if (p.kategorie !== 'pudel' || p.club_evenings?.status !== 'freigegeben') continue
      if (!inY(p.club_evenings?.datum)) continue
      pudel[p.member_id] = (pudel[p.member_id] ?? 0) + p.anzahl
    }
    const anwesend: Record<string, number> = {}
    for (const a of attendance.data ?? []) {
      if (a.club_evenings?.status !== 'freigegeben' || !inY(a.club_evenings?.datum)) continue
      if (a.anwesend) anwesend[a.member_id] = (anwesend[a.member_id] ?? 0) + 1
    }
    const strafen: Record<string, number> = {}
    let hoch = { name: '—', v: 0 }
    for (const v of verlauf.data ?? []) {
      if (!inY(v.datum)) continue
      if (v.typ === 'strafe' || v.typ === 'sonstige') {
        strafen[v.member_id] = (strafen[v.member_id] ?? 0) + Number(v.betrag)
        if (Number(v.betrag) > hoch.v)
          hoch = { name: byId.get(v.member_id) ?? '?', v: Number(v.betrag) }
      }
    }

    const top = (acc: Record<string, number>) =>
      Object.entries(acc).sort((a, b) => b[1] - a[1])[0]

    const rows: ReviewRow[] = []
    if (ranking[0]) rows.push({ label: 'Meister', name: ranking[0].name, value: `${ranking[0].pts}` })
    const pk = top(pudel)
    if (pk) rows.push({ label: 'Pudelkönig', name: byId.get(pk[0]) ?? '?', value: `${pk[1]}×` })
    const aw = top(anwesend)
    if (aw)
      rows.push({ label: 'Fleißigster', name: byId.get(aw[0]) ?? '?', value: `${aw[1]}×` })
    const st = top(strafen)
    if (st)
      rows.push({
        label: 'Meiste Strafen',
        name: byId.get(st[0]) ?? '?',
        value: `${fmtEuro(st[1])} €`,
      })
    if (hoch.v > 0)
      rows.push({ label: 'Höchste Einzelstrafe', name: hoch.name, value: `${fmtEuro(hoch.v)} €` })
    return rows
  }

  return (
    <>
      <div className="topbar">
        <h1>Meisterschaft {year}</h1>
        <a
          className="backbtn"
          style={{ fontSize: 13 }}
          onClick={async () => {
            const rows = buildReview()
            if (!rows.length) {
              toast('Noch keine Daten für den Rückblick')
              return
            }
            setSharing(true)
            try {
              await shareCanvas(drawYearReview(year, rows), `rueckblick-${year}.png`, `Rückblick ${year}`)
            } finally {
              setSharing(false)
            }
          }}
        >
          {sharing ? 'Bild…' : 'Rückblick teilen'}
        </a>
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

          <div className="section-title">
            <h2>Gesamtwertung</h2>
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
