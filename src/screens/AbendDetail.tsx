import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { useEvening, useMembers, matrixSum } from '../lib/api'
import { drawEveningReport, type PersonTotal, type ReviewRow } from '../lib/canvasCards'
import { fmtEuro, fmtLongDE, initials } from '../lib/format'
import { shareCanvas } from '../lib/share'
import { KAT_LABEL, type PenaltyKat } from '../lib/types'

const KATS: PenaltyKat[] = ['pudel', 'c10', 'c50', 'c100']

export default function AbendDetail() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const toast = useToast()
  const detail = useEvening(id)
  const members = useMembers()
  const [sharing, setSharing] = useState(false)

  const rows = useMemo(() => {
    if (!detail.data || !members.data) return []
    const d = detail.data
    const presentCount = Math.max(1, d.attendance.filter((a) => a.anwesend).length)
    const matrixTotal = matrixSum(
      d.penalties
        .filter((p) => d.attendance.find((a) => a.member_id === p.member_id)?.anwesend)
        .map((p) => ({ kategorie: p.kategorie, anzahl: p.anzahl })),
    )
    const avgMatrix = matrixTotal / presentCount

    return members.data.map((m) => {
      const att = d.attendance.find((a) => a.member_id === m.id)
      const anwesend = att?.anwesend ?? false
      const pens = d.penalties.filter((p) => p.member_id === m.id)
      const matrix = matrixSum(pens.map((p) => ({ kategorie: p.kategorie, anzahl: p.anzahl })))
      const sonst = d.sonstige.filter((s) => s.member_id === m.id)
      const punkte = d.points.find((p) => p.member_id === m.id)?.punkte ?? 0
      const bahnShare = anwesend && d.costs ? Number(d.costs.kegelbahnkosten) / presentCount : 0
      const getrShare = anwesend && d.costs ? Number(d.costs.getraenkekosten) / presentCount : 0
      const sonstSum = sonst.reduce((s, x) => s + Number(x.betrag), 0)
      const total = anwesend ? matrix + bahnShare + getrShare + sonstSum : avgMatrix + sonstSum
      return {
        member: m,
        anwesend,
        pens: Object.fromEntries(
          KATS.map((k) => [k, pens.find((p) => p.kategorie === k)?.anzahl ?? 0]),
        ) as Record<PenaltyKat, number>,
        matrix,
        sonst,
        punkte,
        bahnShare,
        getrShare,
        avgMatrix,
        total,
      }
    })
  }, [detail.data, members.data])

  const teilnehmer = rows.filter((r) => r.anwesend).length
  const einnahmen = useMemo(() => {
    if (!detail.data) return 0
    return (
      rows.reduce((s, r) => s + (r.anwesend ? r.matrix + r.sonst.reduce((a, x) => a + Number(x.betrag), 0) : 0), 0) +
      Number(detail.data.costs?.kegelbahnkosten ?? 0) +
      Number(detail.data.costs?.getraenkekosten ?? 0)
    )
  }, [rows, detail.data])

  const highlights = useMemo<ReviewRow[]>(() => {
    const present = rows.filter((r) => r.anwesend)
    if (!present.length) return []
    const byPudel = [...present].sort((a, b) => b.pens.pudel - a.pens.pudel)[0]
    const byMost = [...present].sort((a, b) => b.matrix - a.matrix)[0]
    const byLeast = [...present].sort((a, b) => a.matrix - b.matrix)[0]
    return [
      { label: 'Meiste Pudel', name: byPudel.member.name, value: `${byPudel.pens.pudel} Pudel` },
      { label: 'Meiste Strafen', name: byMost.member.name, value: `${fmtEuro(byMost.matrix)} €` },
      { label: 'Wenigste Strafen', name: byLeast.member.name, value: `${fmtEuro(byLeast.matrix)} €` },
    ]
  }, [rows])

  if (detail.isLoading || members.isLoading) return <div className="center-note">Lädt…</div>
  if (!detail.data) return <div className="center-note">Abend nicht gefunden</div>
  const ev = detail.data.evening

  return (
    <>
      <div className="topbar">
        <button className="backbtn" onClick={() => nav('/abende')}>
          ‹ Abende
        </button>
        <h1 style={{ fontSize: 17 }}>{fmtLongDE(ev.datum)}</h1>
        <span className="status-chip freigegeben">Freigegeben</span>
      </div>

      <div className="tile-grid">
        <div className="tile">
          <div className="value num">{teilnehmer}</div>
          <div className="label">Teilnehmer</div>
        </div>
        <div className="tile">
          <div className="value num amber">{fmtEuro(einnahmen)} €</div>
          <div className="label">Einnahmen</div>
        </div>
      </div>

      {highlights.length > 0 && (
        <>
          <div className="section-title">
            <h2>Abend-Highlights</h2>
          </div>
          {highlights.map((h) => (
            <div className="verlauf-row" key={h.label}>
              <div className="verlauf-left">
                <div className="vl-date">{h.label}</div>
                <div className="vl-label" style={{ fontSize: 15, fontWeight: 600 }}>{h.name}</div>
              </div>
              <div className="verlauf-amt num" style={{ color: 'var(--amber)' }}>{h.value}</div>
            </div>
          ))}
        </>
      )}

      <div className="section-title">
        <h2>Alle Teilnehmer</h2>
      </div>
      <div className="list-pad">
        {rows.map((r) => {
          const kats = KATS.filter((k) => r.pens[k] > 0).map((k) => `${r.pens[k]}× ${KAT_LABEL[k]}`)
          return (
            <div className={'entry-card' + (r.anwesend ? '' : ' is-absent')} key={r.member.id} style={{ opacity: r.anwesend ? 1 : 0.6 }}>
              <div className="entry-top">
                <div className="entry-name">
                  <span className="entry-avatar">{initials(r.member.name)}</span>
                  {r.member.name}
                </div>
                <span className={'entry-sum' + (r.total > 0 ? ' active' : '')}>
                  {fmtEuro(r.total)} €
                </span>
              </div>
              {r.anwesend ? (
                <div className="p-sub">
                  {[
                    ...kats,
                    r.punkte > 0 ? `${r.punkte} Pkt` : null,
                    r.bahnShare > 0 ? `${fmtEuro(r.bahnShare)} € Bahn` : null,
                    r.getrShare > 0 ? `${fmtEuro(r.getrShare)} € Getränke` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'Keine Strafen'}
                </div>
              ) : (
                <div className="p-sub">
                  Abwesend · Ø-Strafe der Anwesenden ({fmtEuro(r.avgMatrix)} €)
                </div>
              )}
              {r.sonst.length > 0 && (
                <div className="sonstige-list">
                  {r.sonst.map((s) => (
                    <div className="p-sub" key={s.id}>
                      + {s.grund}: {fmtEuro(Number(s.betrag))} €
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="list-pad" style={{ paddingBottom: 24 }}>
        <button
          className="cta"
          disabled={sharing}
          onClick={async () => {
            setSharing(true)
            try {
              const people: PersonTotal[] = [...rows]
                .sort((a, b) => b.total - a.total)
                .map((r) => ({ name: r.member.name, total: r.total, absent: !r.anwesend }))
              const canvas = drawEveningReport(
                fmtLongDE(ev.datum),
                { teilnehmer, einnahmen },
                highlights,
                people,
              )
              const outcome = await shareCanvas(canvas, `abend-${ev.datum}.png`, 'Kegelabend')
              if (outcome === 'downloaded') {
                toast('Bild gespeichert – jetzt z. B. in WhatsApp anhängen')
              }
            } finally {
              setSharing(false)
            }
          }}
        >
          {sharing ? 'Erzeuge Bild…' : 'Als Bild teilen'}
        </button>
      </div>
    </>
  )
}
