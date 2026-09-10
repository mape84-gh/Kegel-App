import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    setBusy(false)
    if (error) setErr(error.message)
    else setSent(true)
  }

  return (
    <div className="frame">
      <div className="club-header">
        <div className="club-logo-wrap">RS</div>
        <h1 className="club-title">Ratinger Skatschützen</h1>
      </div>

      {sent ? (
        <div className="center-note">
          Wir haben dir einen Login-Link an <b>{email}</b> geschickt.
          <br />
          Öffne ihn auf diesem Gerät.
        </div>
      ) : (
        <form onSubmit={submit}>
          <div className="field-row">
            <label>E-Mail</label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          {err && <div className="center-note danger">{err}</div>}
          <button className="cta" type="submit" disabled={busy}>
            {busy ? 'Sende…' : 'Login-Link anfordern'}
          </button>
        </form>
      )}
    </div>
  )
}
