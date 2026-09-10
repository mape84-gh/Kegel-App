import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import {
  useAddMember,
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

  const [handle, setHandle] = useState('')
  const [newName, setNewName] = useState('')
  const [newBday, setNewBday] = useState('')

  useEffect(() => {
    if (settings.data) setHandle(settings.data.paypalme_handle ?? '')
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
          <button
            className="cta"
            disabled={updateSettings.isPending}
            onClick={async () => {
              await updateSettings.mutateAsync({ paypalme_handle: handle.trim() || null })
              toast('Gespeichert')
            }}
          >
            Handle speichern
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
