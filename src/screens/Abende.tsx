import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useAllAttendance, useCreateEvening, useEvenings, useVerlauf } from '../lib/api'
import { fmtEuro, fmtLongDE } from '../lib/format'

const STATUS_LABEL: Record<string, string> = {
  entwurf: 'Entwurf',
  kontrolle: 'Kontrolle',
  freigegeben: 'Freigegeben',
}

export default function Abende() {
  const nav = useNavigate()
  const { isStaff, member } = useAuth()
  const evenings = useEvenings()
  const attendance = useAllAttendance()
  const verlauf = useVerlauf()
  const create = useCreateEvening()
  const [year, setYear] = useState<number | 'alle'>(new Date().getFullYear())

  const years = useMemo(() => {
    const s = new Set<number>()
    for (const e of evenings.data ?? []) s.add(new Date(e.datum).getFullYear())
    return [...s].sort((a, b) => b - a)
  }, [evenings.data])

  const list = useMemo(() => {
    const all = evenings.data ?? []
    if (year === 'alle') return all
    return all.filter((e) => new Date(e.datum).getFullYear() === year)
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

  async function newEvening() {
    const today = new Date().toISOString().slice(0, 10)
    const ev = await create.mutateAsync({ datum: today, ersteller_id: member?.id ?? null })
    nav(`/abende/${ev.id}`)
  }

  return (
    <>
      <div className="topbar">
        <h1>Kegelabende</h1>
        {isStaff && (
          <button className="icon-btn" onClick={newEvening} disabled={create.isPending}>
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

      <div className="list-pad">
        {evenings.isLoading && <div className="center-note">Lädt…</div>}
        {!evenings.isLoading && list.length === 0 && (
          <div className="center-note">Keine Abende in diesem Zeitraum</div>
        )}
        {list.map((e) => {
          const clickable = isStaff && e.status !== 'freigegeben'
          const released = e.status === 'freigegeben'
          return (
            <div
              key={e.id}
              className="card abend-card"
              onClick={() => (clickable ? nav(`/abende/${e.id}`) : undefined)}
              style={{ cursor: clickable ? 'pointer' : 'default' }}
            >
              <div className="abend-left">
                <div className="d1">
                  {fmtLongDE(e.datum)}
                  {released && <span className="status-dot ok" />}
                </div>
                <div className="d2">
                  {released
                    ? `${teilnehmer[e.id] ?? 0} Teilnehmer`
                    : e.ort || 'Kegelbahn'}
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
    </>
  )
}
