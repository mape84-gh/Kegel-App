import { useNavigate } from 'react-router-dom'
import { fmtEuro } from '../lib/format'
import { HAUSNUMMER_HINWEIS, KATALOG, KATALOG_INTRO } from '../lib/strafenkatalog'

export default function Strafen() {
  const nav = useNavigate()
  return (
    <>
      <div className="topbar">
        <button className="backbtn" onClick={() => nav(-1)}>
          ‹ Zurück
        </button>
        <h1 style={{ fontSize: 18 }}>Strafenkatalog</h1>
      </div>

      <div className="center-note" style={{ textAlign: 'left', padding: '0 16px 12px' }}>
        {KATALOG_INTRO}
      </div>

      {KATALOG.map((g) => (
        <details key={g.titel} className="card" style={{ padding: 0 }}>
          <summary
            style={{
              listStyle: 'none',
              cursor: 'pointer',
              padding: '14px 16px',
              fontWeight: 600,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{g.titel}</span>
            <span style={{ color: 'var(--muted)' }}>{g.rows.length}</span>
          </summary>
          {g.intro && (
            <div className="p-sub" style={{ padding: '0 16px 8px' }}>
              {g.intro}
            </div>
          )}
          {g.rows.map((r, i) => (
            <div className="verlauf-row" key={i}>
              <div className="verlauf-left" style={{ paddingRight: 12 }}>
                <div className="vl-label">{r.text}</div>
                {r.note && <div className="vl-date">{r.note}</div>}
              </div>
              <div className="verlauf-amt num">{fmtEuro(r.preis)} €</div>
            </div>
          ))}
        </details>
      ))}

      <div className="center-note" style={{ textAlign: 'left', padding: '4px 16px 24px' }}>
        {HAUSNUMMER_HINWEIS}
      </div>
    </>
  )
}
