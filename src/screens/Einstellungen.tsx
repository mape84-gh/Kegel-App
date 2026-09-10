import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import {
  useAddMember,
  useDemoData,
  useMembers,
  useRemoveMember,
  useSettings,
  useUpdateSettings,
} from '../lib/api'

export default function Einstellungen() {
  const nav = useNavigate()
  const { member, role, signOut } = useAuth()
  const toast = useToast()
  const isAdmin = role === 'admin'
  const members = useMembers()
  const settings = useSettings()
  const updateSettings = useUpdateSettings()
  const addMember = useAddMember()
  const removeMember = useRemoveMember()
  const demo = useDemoData()

  const [handle, setHandle] = useState('')
  const [rhythmus, setRhythmus] = useState('4')
  const [newName, setNewName] = useState('')
  const [newBday, setNewBday] = useState('')

  useEffect(() => {
    if (settings.data) {
      setHandle(settings.data.paypalme_handle ?? '')
      setRhythmus(String(settings.data.termin_rhythmus_wochen ?? 4))
    }
  }, [settings.data])

  return (
    <>
      <div className="topbar">
        <button className="backbtn" onClick={() => nav('/')}>
          ‹ Home
        </button>
        <h1 style={{ fontSize: 18 }}>Einstellungen</h1>
      </div>

      <div className="field-row">
        <label>Angemeldet als</label>
        <input value={`${member?.name ?? ''} · ${role ?? ''}`} disabled />
      </div>

      {isAdmin && (
        <>
          <div className="field-row">
            <label>PayPalMe-Handle</label>
            <input
              value={handle}
              placeholder="z. B. Kegelabend14102024"
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
          <div className="field-row">
            <label>Termin-Rhythmus (Wochen)</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={rhythmus}
              onChange={(e) => setRhythmus(e.target.value)}
            />
          </div>
          <button
            className="cta"
            disabled={updateSettings.isPending}
            onClick={async () => {
              await updateSettings.mutateAsync({
                paypalme_handle: handle.trim() || null,
                termin_rhythmus_wochen: Math.max(1, +rhythmus || 4),
              })
              toast('Gespeichert')
            }}
          >
            Einstellungen speichern
          </button>

          <div className="section-title">
            <h2>Mitglieder</h2>
          </div>
          <div className="list-pad">
            {(members.data ?? []).map((m) => (
              <div className="card abend-card" key={m.id}>
                <div className="abend-left">
                  <div className="d1">{m.name}</div>
                  <div className="d2">
                    {m.role}
                    {m.geburtstag ? ` · ${m.geburtstag}` : ''}
                  </div>
                </div>
                {m.id !== member?.id && (
                  <button
                    className="text-btn danger"
                    onClick={async () => {
                      if (!confirm(`${m.name} wirklich entfernen?`)) return
                      await removeMember.mutateAsync(m.id)
                      toast('Entfernt')
                    }}
                  >
                    Entfernen
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="field-row">
            <label>Neues Mitglied</label>
            <input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input
              placeholder="Geburtstag TT.MM"
              value={newBday}
              onChange={(e) => setNewBday(e.target.value)}
            />
          </div>
          <button
            className="cta"
            disabled={addMember.isPending || !newName.trim()}
            onClick={async () => {
              await addMember.mutateAsync({
                name: newName.trim(),
                geburtstag: newBday.trim() || undefined,
              })
              setNewName('')
              setNewBday('')
              toast('Hinzugefügt')
            }}
          >
            + Mitglied anlegen
          </button>
        </>
      )}

      {isAdmin && (
        <>
          <div className="section-title">
            <h2>Demo-Daten</h2>
          </div>
          <div className="list-pad">
            <div className="card">
              <div className="p-sub" style={{ marginBottom: 10 }}>
                Füllt alle Screens mit sechs freigegebenen Beispiel-Abenden (Saison
                2025/26), Beiträgen und Zahlungen – zum Ausprobieren. „Leeren" entfernt
                alle Abende, Verläufe und Beiträge, die Mitgliederliste bleibt.
              </div>
              <div className="mgb-row">
                <button
                  disabled={demo.seed.isPending || demo.wipe.isPending}
                  onClick={async () => {
                    await demo.seed.mutateAsync()
                    toast('Demo-Daten geladen')
                  }}
                >
                  {demo.seed.isPending ? 'Lädt…' : 'Demo-Daten laden'}
                </button>
                <button
                  className="danger"
                  disabled={demo.seed.isPending || demo.wipe.isPending}
                  onClick={async () => {
                    if (!confirm('Wirklich alle Abende & Verläufe löschen?')) return
                    await demo.wipe.mutateAsync()
                    toast('Alles geleert')
                  }}
                >
                  {demo.wipe.isPending ? 'Leert…' : 'Alles leeren'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <button
        className="text-btn danger"
        style={{ display: 'block', margin: '24px auto' }}
        onClick={async () => {
          await signOut()
        }}
      >
        Abmelden
      </button>
    </>
  )
}
