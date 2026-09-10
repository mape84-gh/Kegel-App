import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { ToastProvider } from './components/Toast'
import TabBar from './components/TabBar'
import Login from './screens/Login'
import Home from './screens/Home'
import Abende from './screens/Abende'
import AbendErfassung from './screens/AbendErfassung'
import Meisterschaft from './screens/Meisterschaft'
import Statistik from './screens/Statistik'
import Finanzen from './screens/Finanzen'
import Einstellungen from './screens/Einstellungen'

function StaffOnly({ children }: { children: ReactNode }) {
  const { isStaff } = useAuth()
  if (!isStaff) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { session, member, loading } = useAuth()

  if (loading) {
    return (
      <div className="frame">
        <div className="center-note">Lädt…</div>
      </div>
    )
  }

  if (!session) return <Login />

  if (!member) {
    return (
      <div className="frame">
        <div className="center-note">
          Dein Account ist noch keinem Mitglied zugeordnet.
          <br />
          Bitte an einen Admin wenden.
        </div>
      </div>
    )
  }

  return (
    <ToastProvider>
      <div className="frame">
        <div className="screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/abende" element={<Abende />} />
            <Route
              path="/abende/:id"
              element={
                <StaffOnly>
                  <AbendErfassung />
                </StaffOnly>
              }
            />
            <Route path="/meisterschaft" element={<Meisterschaft />} />
            <Route path="/statistik" element={<Statistik />} />
            <Route path="/finanzen" element={<Finanzen />} />
            <Route path="/einstellungen" element={<Einstellungen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <TabBar />
      </div>
    </ToastProvider>
  )
}
