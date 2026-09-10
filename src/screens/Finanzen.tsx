import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import {
  rueckstandByMember,
  useAddClubTransaction,
  useBookBeitrag,
  useClubTransactions,
  useConfirmPayment,
  useMembers,
  useVerlauf,
} from '../lib/api'
import { fmtEuro, initials } from '../lib/format'
import { copyToClipboard, shareViaWhatsApp } from '../lib/share'

type Tab = 'umsaetze' | 'beitraege' | 'rueckstaende'

function deDate(iso: string) {
  return iso.split('-').reverse().join('.')
}

export default function Finanzen() {
  const { isStaff, member } = useAuth()
  const toast = useToast()
  const members = useMembers()
  const verlauf = useVerlauf()
  const clubTx = useClubTransactions()
  const pay = useConfirmPayment()
  const bookBeitrag = useBookBeitrag()
  const addTx = useAddClubTransaction()

  const [tab, setTab] = useState<Tab>('rueckstaende')
  const [openId, setOpenId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [addMode, setAddMode] = useState<null | 'beitrag' | 'umsatz'>(null)

  const nameById = useMemo(
    () => new Map((members.data ?? []).map((m) => [m.id, m.name])),
    [members.data],
  )
  const rueck = useMemo(() => rueckstandByMember(verlauf.data ?? []), [verlauf.data])
  const rows = useMemo(
    () =>
      (members.data ?? [])
        .map((m) => ({ ...m, betrag: rueck[m.id] ?? 0 }))
        .sort((a, b) => b.betrag - a.betrag),
    [members.data, rueck],
  )

  const offenGesamt = rows.reduce((s, r) => s + Math.max(0, r.betrag), 0)
  const zahlungen = (verlauf.data ?? [])
    .filter((v) => v.typ === 'zahlung')
    .reduce((s, v) => s + -Number(v.betrag), 0)
  const txSaldo = (clubTx.data ?? []).reduce(
    (s, t) => s + Number(t.einnahmen) - Number(t.ausgaben),
    0,
  )
  const kasse = zahlungen + txSaldo
  const gesamt = kasse + offenGesamt

  // Umsätze feed: club transactions + member payments, newest first
  const umsaetze = useMemo(() => {
    const fromTx = (clubTx.data ?? []).map((t) => ({
      id: t.id,
      datum: t.datum,
      label: t.bezeichnung,
      betrag: Number(t.einnahmen) - Number(t.ausgaben),
    }))
    const fromPay = (verlauf.data ?? [])
      .filter((v) => v.typ === 'zahlung')
      .map((v) => ({
        id: v.id,
        datum: v.datum,
        label: `${v.label} · ${nameById.get(v.member_id) ?? ''}`.trim(),
        betrag: -Number(v.betrag),
      }))
    return [...fromTx, ...fromPay].sort((a, b) => b.datum.localeCompare(a.datum))
  }, [clubTx.data, verlauf.data, nameById])

  // Beiträge feed: every per-member ledger position
  const beitraege = useMemo(
    () =>
      (verlauf.data ?? [])
        .filter((v) => v.typ !== 'zahlung')
        .map((v) => ({
          id: v.id,
          datum: v.datum,
          label: `${v.label}${
            v.typ === 'sonstige' || v.typ === 'beitrag' ? ` · ${nameById.get(v.member_id) ?? ''}` : ''
          }`,
          betrag: Number(v.betrag),
        }))
        .sort((a, b) => b.datum.localeCompare(a.datum)),
    [verlauf.data, nameById],
  )

  const openMember = members.data?.find((m) => m.id === openId)
  const openVerlauf = (verlauf.data ?? [])
    .filter((v) => v.member_id === openId)
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.created_at.localeCompare(a.created_at))

  function whatsappText() {
    const heute = new Date().toLocaleDateString('de-DE')
    const offen = rows.filter((r) => r.betrag > 0.005)
    const bezahlt = rows.filter((r) => r.betrag <= 0.005)
    const lines = [
      '*Zahlungsstand – Ratinger Skatschützen*',
      `Stand: ${heute}`,
      '',
      `*Noch offen (${offen.length}):*`,
      ...(offen.length
        ? offen.map((r) => `❌ ${r.name} – ${fmtEuro(r.betrag)} €`)
        : ['— alle bezahlt 🎉']),
      '',
      `*Bezahlt (${bezahlt.length}):*`,
      ...bezahlt.map((r) => `✅ ${r.name}`),
      '',
      `Summe offen: ${fmtEuro(offenGesamt)} €`,
      'Bitte per PayPal oder bar beim Kassenwart begleichen.',
    ]
    return lines.join('\n')
  }

  return (
    <>
      <div className="topbar">
        <h1>Finanzen</h1>
        {isStaff && (
          <button className="icon-btn" onClick={() => setAddMode('beitrag')} aria-label="Hinzufügen">
            ＋
          </button>
        )}
      </div>

      <div className="fin-hero">
        <div className="big num">{fmtEuro(gesamt)} €</div>
        <div className="lbl">Gesamtbetrag</div>
        <div className="fin-split">
          <div>
            <div className="num" style={{ color: 'var(--green)' }}>{fmtEuro(kasse)} €</div>
            <div className="lbl2">Kassenbetrag</div>
          </div>
          <div>
            <div className="num" style={{ color: 'var(--red)' }}>{fmtEuro(offenGesamt)} €</div>
            <div className="lbl2">Rückstände</div>
          </div>
        </div>
      </div>

      <div className="chip-row">
        <button className={'chip' + (tab === 'umsaetze' ? ' active' : '')} onClick={() => setTab('umsaetze')}>
          Umsätze
        </button>
        <button className={'chip' + (tab === 'beitraege' ? ' active' : '')} onClick={() => setTab('beitraege')}>
          Beiträge
        </button>
        <button
          className={'chip' + (tab === 'rueckstaende' ? ' active' : '')}
          onClick={() => setTab('rueckstaende')}
        >
          Rückstände
        </button>
      </div>

      {tab === 'rueckstaende' && (
        <>
          <div className="section-title">
            <h2>Rückstände pro Person</h2>
            <a
              onClick={async () => {
                const t = whatsappText()
                const copied = await copyToClipboard(t)
                shareViaWhatsApp(t)
                toast(copied ? 'Text kopiert & WhatsApp offen' : 'WhatsApp geöffnet')
              }}
            >
              WhatsApp-Export
            </a>
          </div>
          <div>
            {rows.map((r) => (
              <div
                className="rueck-row"
                key={r.id}
                onClick={() => {
                  setOpenId(r.id)
                  setPayAmount(r.betrag > 0 ? r.betrag.toFixed(2) : '')
                }}
              >
                <div className="rank-avatar">{initials(r.name)}</div>
                <div className="rueck-name">{r.name}</div>
                <div className={'rueck-val num ' + (r.betrag > 0.005 ? 'pos' : 'zero')}>
                  {fmtEuro(r.betrag)} €
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'umsaetze' && (
        <FeedList rows={umsaetze} emptyText="Noch keine Umsätze erfasst" signed />
      )}
      {tab === 'beitraege' && (
        <FeedList rows={beitraege} emptyText="Noch keine Beiträge erfasst" />
      )}

      {/* --- add sheet --- */}
      {addMode && (
        <AddSheet
          mode={addMode}
          setMode={setAddMode}
          members={(members.data ?? []).map((m) => ({ id: m.id, name: m.name }))}
          busy={bookBeitrag.isPending || addTx.isPending}
          onClose={() => setAddMode(null)}
          onSaveBeitrag={async (v) => {
            await bookBeitrag.mutateAsync({ ...v })
            toast('Beitrag gebucht')
            setAddMode(null)
          }}
          onSaveUmsatz={async (v) => {
            await addTx.mutateAsync({ ...v, created_by: member?.id ?? null })
            toast('Umsatz gebucht')
            setAddMode(null)
          }}
        />
      )}

      {/* --- member modal --- */}
      {openId && (
        <div className="modal-overlay" onClick={() => setOpenId(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-top">
              <span className="modal-name">{openMember?.name}</span>
              <button className="modal-close" onClick={() => setOpenId(null)}>
                Fertig
              </button>
            </div>
            <div className="modal-rueck">
              <div className="val num">{fmtEuro(rueck[openId] ?? 0)} €</div>
              <div className="lbl">Aktueller Rückstand</div>
            </div>
            {isStaff && (
              <div className="modal-pay">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Betrag €"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                />
                <button
                  disabled={pay.isPending || !(+payAmount > 0)}
                  onClick={async () => {
                    await pay.mutateAsync({ member_id: openId, betrag: +payAmount })
                    toast('Zahlung gebucht')
                    setPayAmount('')
                  }}
                >
                  Zahlung bestätigen
                </button>
              </div>
            )}
            <div className="modal-section-label">Verlauf</div>
            {openVerlauf.length === 0 ? (
              <div className="verlauf-empty">Noch keine Einträge</div>
            ) : (
              openVerlauf.map((v) => (
                <div className="verlauf-row" key={v.id}>
                  <div className="verlauf-left">
                    <div className="vl-label">{v.label}</div>
                    <div className="vl-date">{deDate(v.datum)}</div>
                  </div>
                  <div className={'verlauf-amt num ' + (Number(v.betrag) >= 0 ? 'plus' : 'minus')}>
                    {Number(v.betrag) >= 0 ? '+' : '−'}
                    {fmtEuro(Math.abs(Number(v.betrag)))} €
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  )
}

function FeedList({
  rows,
  emptyText,
  signed = false,
}: {
  rows: { id: string; datum: string; label: string; betrag: number }[]
  emptyText: string
  signed?: boolean
}) {
  if (rows.length === 0) return <div className="verlauf-empty">{emptyText}</div>
  const seenYears = new Set<string>()
  const withHeads = rows.map((r) => {
    const y = r.datum.slice(0, 4)
    const showHead = !seenYears.has(y)
    seenYears.add(y)
    return { r, head: showHead ? y : null }
  })
  return (
    <div>
      {withHeads.map(({ r, head }) => {
        const pos = r.betrag >= 0
        return (
          <div key={r.id}>
            {head && <div className="modal-section-label">{head}</div>}
            <div className="verlauf-row">
              <div className="verlauf-left">
                <div className="vl-label">{r.label}</div>
                <div className="vl-date">{deDate(r.datum)}</div>
              </div>
              <div
                className="verlauf-amt num"
                style={{ color: signed ? (pos ? 'var(--green)' : 'var(--red)') : 'var(--cream)' }}
              >
                {signed ? (pos ? '+' : '−') : ''}
                {fmtEuro(Math.abs(r.betrag))} €
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AddSheet({
  mode,
  setMode,
  members,
  busy,
  onClose,
  onSaveBeitrag,
  onSaveUmsatz,
}: {
  mode: 'beitrag' | 'umsatz'
  setMode: (m: 'beitrag' | 'umsatz') => void
  members: { id: string; name: string }[]
  busy: boolean
  onClose: () => void
  onSaveBeitrag: (v: {
    label: string
    betrag: number
    memberIds: string[]
    alsMitgliedsbeitrag: boolean
  }) => Promise<void>
  onSaveUmsatz: (v: {
    datum: string
    bezeichnung: string
    einnahmen: number
    ausgaben: number
  }) => Promise<void>
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [bez, setBez] = useState('')
  const [datum, setDatum] = useState(today)
  const [betrag, setBetrag] = useState('')
  const [einnahmen, setEinnahmen] = useState('')
  const [ausgaben, setAusgaben] = useState('')
  const [alsBeitrag, setAlsBeitrag] = useState(true)
  const [sel, setSel] = useState<Set<string>>(new Set(members.map((m) => m.id)))

  const canSave =
    bez.trim() !== '' &&
    (mode === 'beitrag'
      ? +betrag > 0 && sel.size > 0
      : +einnahmen > 0 || +ausgaben > 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-top">
          <button className="modal-close" onClick={onClose}>
            Schließen
          </button>
          <span className="modal-name">{mode === 'beitrag' ? 'Neuer Beitrag' : 'Neuer Umsatz'}</span>
          <button
            className="modal-close"
            style={{ fontWeight: 700, opacity: canSave && !busy ? 1 : 0.4 }}
            disabled={!canSave || busy}
            onClick={() =>
              mode === 'beitrag'
                ? onSaveBeitrag({
                    label: bez.trim(),
                    betrag: +betrag,
                    memberIds: [...sel],
                    alsMitgliedsbeitrag: alsBeitrag,
                  })
                : onSaveUmsatz({
                    datum,
                    bezeichnung: bez.trim(),
                    einnahmen: +einnahmen || 0,
                    ausgaben: +ausgaben || 0,
                  })
            }
          >
            Speichern
          </button>
        </div>

        <div className="toggle-row">
          <button
            className={'chip' + (mode === 'beitrag' ? ' active' : '')}
            onClick={() => setMode('beitrag')}
          >
            Beitrag
          </button>
          <button
            className={'chip' + (mode === 'umsatz' ? ' active' : '')}
            onClick={() => setMode('umsatz')}
          >
            Umsatz
          </button>
        </div>

        <div className="field-row">
          <label>Bezeichnung</label>
          <input value={bez} onChange={(e) => setBez(e.target.value)} placeholder="z. B. Mitgliedsbeitrag 2026" />
        </div>
        <div className="field-row">
          <label>Datum</label>
          <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>

        {mode === 'beitrag' ? (
          <>
            <div className="field-row">
              <label>Beitragshöhe (€ pro Person)</label>
              <input
                type="number"
                inputMode="decimal"
                value={betrag}
                onChange={(e) => setBetrag(e.target.value)}
              />
            </div>
            <label
              className="field-row"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <input
                type="checkbox"
                checked={alsBeitrag}
                onChange={(e) => setAlsBeitrag(e.target.checked)}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 13 }}>Als Mitgliedsbeitrag zählen</span>
            </label>

            <div className="section-title">
              <h2>Mitglieder auswählen</h2>
              <a
                onClick={() =>
                  setSel((s) =>
                    s.size === members.length ? new Set() : new Set(members.map((m) => m.id)),
                  )
                }
              >
                {sel.size === members.length ? 'Keine' : 'Alle'}
              </a>
            </div>
            <div>
              {members.map((m) => {
                const on = sel.has(m.id)
                return (
                  <div
                    className="rueck-row"
                    key={m.id}
                    onClick={() =>
                      setSel((s) => {
                        const n = new Set(s)
                        if (n.has(m.id)) n.delete(m.id)
                        else n.add(m.id)
                        return n
                      })
                    }
                  >
                    <div className="rank-avatar">{initials(m.name)}</div>
                    <div className="rueck-name">{m.name}</div>
                    <div
                      className="num"
                      style={{ color: on ? 'var(--green)' : 'var(--red)', fontSize: 18 }}
                    >
                      {on ? '✓' : '✕'}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div className="field-row">
              <label>Einnahmen (€)</label>
              <input
                type="number"
                inputMode="decimal"
                value={einnahmen}
                onChange={(e) => setEinnahmen(e.target.value)}
              />
            </div>
            <div className="field-row">
              <label>Ausgaben (€)</label>
              <input
                type="number"
                inputMode="decimal"
                value={ausgaben}
                onChange={(e) => setAusgaben(e.target.value)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
