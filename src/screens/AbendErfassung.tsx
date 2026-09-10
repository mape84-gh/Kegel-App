import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import {
  matrixSum,
  useEvening,
  useMembers,
  useReleaseEvening,
  useSaveDraft,
  useSetEveningStatus,
  type DraftRowInput,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { KAT_LABEL, type PenaltyKat } from '../lib/types'
import { fmtEuro, fmtLongDE, initials } from '../lib/format'

const KATS: PenaltyKat[] = ['pudel', 'c10', 'c50', 'c100']

interface Row {
  anwesend: boolean
  penalties: Record<PenaltyKat, number>
  punkte: number
  sonstige: { grund: string; betrag: number }[]
}

function emptyRow(): Row {
  return { anwesend: true, penalties: { pudel: 0, c10: 0, c50: 0, c100: 0 }, punkte: 0, sonstige: [] }
}

export default function AbendErfassung() {
  const { id } = useParams<{ id: string }>()
  const nav = useNavigate()
  const toast = useToast()
  const detail = useEvening(id)
  const members = useMembers()
  const save = useSaveDraft(id!)
  const setStatus = useSetEveningStatus(id!)
  const release = useReleaseEvening(id!)

  const [rows, setRows] = useState<Record<string, Row>>({})
  const [bahn, setBahn] = useState(0)
  const [getr, setGetr] = useState(0)
  const [datum, setDatum] = useState('')
  const [confirmRelease, setConfirmRelease] = useState(false)

  const status = detail.data?.evening.status ?? 'entwurf'
  const locked = status !== 'entwurf'

  useEffect(() => {
    if (!detail.data || !members.data) return
    const d = detail.data
    const next: Record<string, Row> = {}
    for (const m of members.data) {
      const r = emptyRow()
      const att = d.attendance.find((a) => a.member_id === m.id)
      r.anwesend = att ? att.anwesend : true
      for (const p of d.penalties.filter((p) => p.member_id === m.id)) {
        r.penalties[p.kategorie] = p.anzahl
      }
      r.punkte = d.points.find((p) => p.member_id === m.id)?.punkte ?? 0
      r.sonstige = d.sonstige
        .filter((s) => s.member_id === m.id)
        .map((s) => ({ grund: s.grund, betrag: Number(s.betrag) }))
      next[m.id] = r
    }
    setRows(next)
    setBahn(Number(d.costs?.kegelbahnkosten ?? 0))
    setGetr(Number(d.costs?.getraenkekosten ?? 0))
    setDatum(d.evening.datum)
  }, [detail.data, members.data])

  const present = useMemo(
    () => Object.values(rows).filter((r) => r.anwesend).length,
    [rows],
  )

  function rowMatrix(r: Row) {
    return matrixSum(KATS.map((k) => ({ kategorie: k, anzahl: r.penalties[k] })))
  }
  function rowSonstige(r: Row) {
    return r.sonstige.reduce((s, x) => s + (Number(x.betrag) || 0), 0)
  }

  const total = useMemo(() => {
    let t = 0
    for (const r of Object.values(rows)) {
      if (r.anwesend) t += rowMatrix(r) + rowSonstige(r)
      else t += rowSonstige(r)
    }
    t += Number(bahn) + Number(getr)
    return t
  }, [rows, bahn, getr])

  function patch(mid: string, fn: (r: Row) => Row) {
    setRows((prev) => ({ ...prev, [mid]: fn(prev[mid] ?? emptyRow()) }))
  }

  async function doSave(silent = false) {
    if (datum && datum !== detail.data?.evening.datum) {
      await supabase.from('club_evenings').update({ datum }).eq('id', id)
    }
    const payload: { rows: DraftRowInput[]; kegelbahnkosten: number; getraenkekosten: number } = {
      rows: (members.data ?? []).map((m) => ({
        member_id: m.id,
        ...(rows[m.id] ?? emptyRow()),
      })),
      kegelbahnkosten: Number(bahn) || 0,
      getraenkekosten: Number(getr) || 0,
    }
    await save.mutateAsync(payload)
    if (!silent) toast('Gespeichert')
  }

  if (detail.isLoading || members.isLoading) {
    return <div className="center-note">Lädt…</div>
  }
  if (!detail.data) return <div className="center-note">Abend nicht gefunden</div>

  return (
    <>
      <div className="topbar">
        <button className="backbtn" onClick={() => nav('/abende')}>
          ‹ Abende
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700 }}>
          {datum ? fmtLongDE(datum) : 'Neuer Abend'}
        </h1>
        <span className={'status-chip ' + status}>
          {status === 'entwurf' ? 'Entwurf' : status === 'kontrolle' ? 'Kontrolle' : 'Freigegeben'}
        </span>
      </div>

      {status === 'entwurf' && (
        <div className="field-row">
          <label>Datum</label>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
      )}

      {status === 'kontrolle' && (
        <div className="locked-banner">
          🔒 Kontroll-Ansicht – Werte gesperrt. Zum Ändern zurück zum Bearbeiten.
        </div>
      )}
      {status === 'freigegeben' && (
        <div className="locked-banner ok">✓ Dieser Abend ist freigegeben.</div>
      )}

      <div className="list-pad">
        <div className="card pauschale-card">
          <div>
            <div className="p-label">Kegelbahnkosten</div>
            <div className="p-sub">
              {fmtEuro(bahn)} € ÷ {present} Anwesende = {fmtEuro(present ? bahn / present : 0)} €
              pro Person
            </div>
          </div>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            disabled={locked}
            value={bahn || ''}
            onChange={(e) => setBahn(+e.target.value || 0)}
          />
        </div>
        <div className="card pauschale-card" style={{ marginTop: 8 }}>
          <div>
            <div className="p-label">Getränkekosten</div>
            <div className="p-sub">
              {fmtEuro(getr)} € ÷ {present} Anwesende = {fmtEuro(present ? getr / present : 0)} €
              pro Person
            </div>
          </div>
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            disabled={locked}
            value={getr || ''}
            onChange={(e) => setGetr(+e.target.value || 0)}
          />
        </div>
      </div>

      <div className="legend">
        <span className="chip">Pudel / 10 ¢ = 0,10 €</span>
        <span className="chip">50 ¢ = 0,50 €</span>
        <span className="chip">1 € = 1,00 €</span>
        <span className="chip" style={{ color: 'var(--gold)', borderColor: 'var(--gold)' }}>
          PKT = Meisterschaft (nur Anwesende)
        </span>
        <span
          className="chip"
          style={{ color: 'var(--amber)', borderColor: 'var(--amber)', cursor: 'pointer' }}
          onClick={() => nav('/strafen')}
        >
          → Ganzer Strafenkatalog
        </span>
      </div>

      <div className="list-pad">
        {(members.data ?? []).map((m) => {
          const r = rows[m.id] ?? emptyRow()
          const sum = r.anwesend ? rowMatrix(r) + rowSonstige(r) : rowSonstige(r)
          return (
            <div key={m.id} className={'entry-card' + (r.anwesend ? '' : ' is-absent')}>
              <div className="entry-top">
                <div className="entry-name">
                  <span className="entry-avatar">{initials(m.name)}</span>
                  {m.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={'entry-sum' + (sum > 0 ? ' active' : '')}>
                    {fmtEuro(sum)} €
                  </span>
                  <button
                    className={
                      'anwesend-toggle ' + (r.anwesend ? 'present' : 'absent')
                    }
                    disabled={locked}
                    onClick={() => patch(m.id, (x) => ({ ...x, anwesend: !x.anwesend }))}
                  >
                    {r.anwesend ? '✓ da' : '✕ weg'}
                  </button>
                </div>
              </div>

              <div className="entry-fields">
                {KATS.map((k) => (
                  <div className="field" key={k}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      disabled={locked}
                      value={r.penalties[k] || ''}
                      onChange={(e) =>
                        patch(m.id, (x) => ({
                          ...x,
                          penalties: { ...x.penalties, [k]: Math.max(0, +e.target.value || 0) },
                        }))
                      }
                    />
                    <label>{KAT_LABEL[k]}</label>
                  </div>
                ))}
                <div className="field">
                  <input
                    className="pkt"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    disabled={locked || !r.anwesend}
                    value={r.punkte || ''}
                    onChange={(e) =>
                      patch(m.id, (x) => ({ ...x, punkte: Math.max(0, +e.target.value || 0) }))
                    }
                  />
                  <label>PKT</label>
                </div>
              </div>

              <div className="sonstige-list">
                {r.sonstige.map((s, i) => (
                  <div className="sonstige-row" key={i}>
                    <input
                      type="text"
                      placeholder="Grund"
                      disabled={locked}
                      value={s.grund}
                      onChange={(e) =>
                        patch(m.id, (x) => {
                          const ns = [...x.sonstige]
                          ns[i] = { ...ns[i], grund: e.target.value }
                          return { ...x, sonstige: ns }
                        })
                      }
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.5"
                      disabled={locked}
                      value={s.betrag || ''}
                      onChange={(e) =>
                        patch(m.id, (x) => {
                          const ns = [...x.sonstige]
                          ns[i] = { ...ns[i], betrag: +e.target.value || 0 }
                          return { ...x, sonstige: ns }
                        })
                      }
                    />
                    {!locked && (
                      <button
                        className="sonstige-remove"
                        onClick={() =>
                          patch(m.id, (x) => ({
                            ...x,
                            sonstige: x.sonstige.filter((_, j) => j !== i),
                          }))
                        }
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                {!locked && (
                  <button
                    className="add-sonstige-btn"
                    onClick={() =>
                      patch(m.id, (x) => ({
                        ...x,
                        sonstige: [...x.sonstige, { grund: '', betrag: 0 }],
                      }))
                    }
                  >
                    + Sonstige Strafe
                  </button>
                )}
              </div>
            </div>
          )
        })}

      </div>

      {status !== 'freigegeben' && (
        <footer className="savebar">
          <div className="total">
            <div className="lbl">
              {status === 'entwurf' ? 'Summe Abend' : 'Summe Abend (Kontrolle)'}
            </div>
            <div className="val num">{fmtEuro(total)} €</div>
          </div>
          {status === 'entwurf' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                disabled={save.isPending}
                onClick={() => doSave()}
                style={{ background: 'var(--surface2)', color: 'var(--amber)' }}
              >
                Speichern
              </button>
              <button
                disabled={save.isPending}
                onClick={async () => {
                  await doSave(true)
                  await setStatus.mutateAsync('kontrolle')
                  toast('Zur Kontrolle')
                }}
              >
                Zur Kontrolle
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStatus.mutate('entwurf')}
                style={{ background: 'var(--surface2)', color: 'var(--amber)' }}
              >
                Bearbeiten
              </button>
              <button onClick={() => setConfirmRelease(true)}>Freigeben ✓</button>
            </div>
          )}
        </footer>
      )}

      {confirmRelease && (
        <div className="confirm-overlay" onClick={() => setConfirmRelease(false)}>
          <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
            <h3>Abend freigeben?</h3>
            <p>
              Abwesende bekommen die Ø-Matrixstrafe der Anwesenden, Punkte werden nur für
              Anwesende verbucht, Beträge auf volle Euro aufgerundet und in den Verlauf
              gebucht. Danach ist der Abend gesperrt.
            </p>
            <div className="confirm-buttons">
              <button onClick={() => setConfirmRelease(false)}>Abbrechen</button>
              <button
                onClick={async () => {
                  try {
                    await release.mutateAsync()
                    setConfirmRelease(false)
                    toast('Freigegeben')
                    nav('/abende')
                  } catch (e) {
                    toast((e as Error).message || 'Fehler bei der Freigabe')
                  }
                }}
              >
                Freigeben
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
