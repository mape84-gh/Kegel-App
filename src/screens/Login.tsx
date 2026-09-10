import { useState } from 'react'
import { supabase } from '../lib/supabase'

type Mode = 'magic' | 'password'

export default function Login() {
  const [mode, setMode] = useState<Mode>('password')
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sent, setSent] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        setSent(true)
      } else if (isSignup) {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw error
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="frame">
      <div className="club-header">
        <div className="club-logo-wrap">RS</div>
        <h1 className="club-title">Ratinger Skatschützen</h1>
      </div>

      {sent ? (
        <div className="center-note">
          Login-Link an <b>{email}</b> geschickt. Öffne ihn auf diesem Gerät.
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

          {mode === 'password' && (
            <div className="field-row">
              <label>Passwort</label>
              <input
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {err && <div className="center-note danger">{err}</div>}

          <button className="cta" type="submit" disabled={busy}>
            {busy
              ? 'Moment…'
              : mode === 'magic'
                ? 'Login-Link anfordern'
                : isSignup
                  ? 'Registrieren'
                  : 'Anmelden'}
          </button>

          {mode === 'password' && (
            <button
              type="button"
              className="text-btn"
              style={{ display: 'block', margin: '4px auto' }}
              onClick={() => setIsSignup((v) => !v)}
            >
              {isSignup ? 'Ich habe schon einen Account' : 'Neuen Account anlegen'}
            </button>
          )}
          <button
            type="button"
            className="text-btn"
            style={{ display: 'block', margin: '4px auto', color: 'var(--muted)' }}
            onClick={() => {
              setMode((m) => (m === 'magic' ? 'password' : 'magic'))
              setErr(null)
            }}
          >
            {mode === 'magic' ? 'Stattdessen mit Passwort' : 'Stattdessen per E-Mail-Link'}
          </button>
        </form>
      )}
    </div>
  )
}
