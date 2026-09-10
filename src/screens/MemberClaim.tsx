import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'
import type { Member } from '../lib/types'
import { initials } from '../lib/format'

export default function MemberClaim() {
  const { session, refreshMember, signOut } = useAuth()
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const unclaimed = useQuery({
    queryKey: ['unclaimed-members'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .is('user_id', null)
        .order('name')
      if (error) throw error
      return data as Member[]
    },
  })

  async function claim(m: Member) {
    setErr(null)
    setBusy(m.id)
    const { error } = await supabase.rpc('claim_member', { p_member: m.id })
    setBusy(null)
    if (error) {
      setErr(error.message)
      return
    }
    await refreshMember()
  }

  return (
    <div className="frame">
      <div className="club-header">
        <div className="club-logo-wrap">RS</div>
        <h1 className="club-title">Wer bist du?</h1>
      </div>
      <div className="center-note" style={{ paddingTop: 0 }}>
        Angemeldet als <b>{session?.user.email}</b>. Wähle deinen Namen aus der Liste –
        das verknüpfen wir einmalig mit deinem Login.
      </div>

      {err && <div className="center-note danger">{err}</div>}

      <div className="list-pad">
        {unclaimed.isLoading && <div className="center-note">Lädt…</div>}
        {unclaimed.data?.length === 0 && (
          <div className="center-note">
            Alle Mitglieder sind bereits zugeordnet. Bitte an einen Admin wenden.
          </div>
        )}
        {unclaimed.data?.map((m) => (
          <button
            key={m.id}
            className="card abend-card"
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
            disabled={!!busy}
            onClick={() => claim(m)}
          >
            <div className="entry-name">
              <span className="entry-avatar">{initials(m.name)}</span>
              {m.name}
            </div>
            <span className="abend-right amt">{busy === m.id ? '…' : 'Das bin ich ›'}</span>
          </button>
        ))}
      </div>

      <button
        className="text-btn danger"
        style={{ display: 'block', margin: '20px auto' }}
        onClick={() => signOut()}
      >
        Abmelden
      </button>
    </div>
  )
}
