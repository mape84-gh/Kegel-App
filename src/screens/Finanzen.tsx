import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import {
  rueckstandByMember,
  useBookMitgliedsgebuehr,
  useConfirmPayment,
  useMembers,
  useVerlauf,
} from '../lib/api'
import { fmtEuro } from '../lib/format'

export default function Finanzen() {
  const { isStaff } = useAuth()
  const toast = useToast()
  const members = useMembers()
  const verlauf = useVerlauf()
  const pay = useConfirmPayment()
  const gebuehr = useBookMitgliedsgebuehr()

  const [openId, setOpenId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [gebuehrBetrag, setGebuehrBetrag] = useState('')

  const rueck = useMemo(() => rueckstandByMember(verlauf.data ?? []), [verlauf.data])

  const rows = useMemo(
    () =>
      (members.data ?? [])
        .map((m) => ({ ...m, betrag: rueck[m.id] ?? 0 }))
        .sort((a, b) => b.betrag - a.betrag),
    [members.data, rueck],
  )

  const offenGesamt = rows.reduce((s, r) => s + Math.max(0, r.betrag), 0)
  const schuldner = rows.filter((r) => r.betrag > 0.005).length
  const kasse = (verlauf.data ?? [])
    .filter((v) => v.typ === 'zahlung')
    .reduce((s, v) => s + -Number(v.betrag), 0)

  const openMember = members.data?.find((m) => m.id === openId)
  const openVerlauf = (verlauf.data ?? [])
    .filter((v) => v.member_id === openId)
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.created_at.localeCompare(a.created_at))

  return (
    <>
      <div className="topbar">
        <h1>Finanzen</h1>
      </div>

      <div className="fin-hero">
        <div className="big num">{fmtEuro(kasse)} €</div>
        <div className="lbl">Eingegangene Zahlungen gesamt</div>
        <div className="fin-split">
          <div>
            <div className="num" style={{ color: 'var(--red)' }}>{fmtEuro(offenGesamt)} €</div>
            <div className="lbl2">offen gesamt</div>
          </div>
          <div>
            <div className="num">{schuldner}</div>
            <div className="lbl2">mit Rückstand</div>
          </div>
        </div>
      </div>

      {isStaff && (
        <div className="card">
          <div className="p-label" style={{ marginBottom: 8 }}>Mitgliedsbeitrag buchen</div>
          <div className="mgb-row">
            <input
              type="number"
              inputMode="decimal"
              placeholder="€"
              value={gebuehrBetrag}
              onChange={(e) => setGebuehrBetrag(e.target.value)}
            />
            <button
              disabled={gebuehr.isPending || !(+gebuehrBetrag > 0)}
              onClick={async () => {
                await gebuehr.mutateAsync({ betrag: +gebuehrBetrag })
                setGebuehrBetrag('')
                toast('Beitrag auf alle gebucht')
              }}
            >
              Auf alle Mitglieder buchen
            </button>
          </div>
        </div>
      )}

      <div className="section-title">
        <h2>Rückstände</h2>
      </div>
      <div>
        {rows.map((r) => (
          <div className="rueck-row" key={r.id} onClick={() => { setOpenId(r.id); setPayAmount((r.betrag > 0 ? r.betrag.toFixed(2) : '')) }}>
            <div className="rueck-name">{r.name}</div>
            <div className={'rueck-val ' + (r.betrag > 0.005 ? 'pos' : 'zero')}>
              {fmtEuro(r.betrag)} €
            </div>
          </div>
        ))}
      </div>

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
              <div className={'val num ' + ((rueck[openId] ?? 0) > 0.005 ? '' : '')}>
                {fmtEuro(rueck[openId] ?? 0)} €
              </div>
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
                    <div className="vl-date">{v.datum.split('-').reverse().join('.')}</div>
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
