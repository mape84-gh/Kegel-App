import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { ToastProvider } from './components/Toast'
import TabBar from './components/TabBar'
import Login from './screens/Login'
import MemberClaim from './screens/MemberClaim'
import Home from './screens/Home'
import Abende from './screens/Abende'
import AbendErfassung from './screens/AbendErfassung'
import AbendDetail from './screens/AbendDetail'
import Meisterschaft from './screens/Meisterschaft'
import Statistik from './screens/Statistik'
import Finanzen from './screens/Finanzen'
import Einstellungen from './screens/Einstellungen'
import Strafen from './screens/Strafen'
import { useEvening } from './lib/api'

/** Released evenings are a read-only report for everyone; drafts are staff-only editing. */
function AbendRoute() {
  const { id } = useParams<{ id: string }>()
  const { isStaff } = useAuth()
  const detail = useEvening(id)

  if (detail.isLoading) return <div className="center-note">Lädt…</div>
  if (!detail.data) return <div className="center-note">Abend nicht gefunden</div>
  if (detail.data.evening.status === 'freigegeben') return <AbendDetail />
  if (!isStaff) return <Navigate to="/abende" replace />
  return <AbendErfassung />
}

export default function App() {
  const { session, member, loading } = useAuth()

  if (loading) {
    return (
      <div className="frame">
        <div className="screen auth-screen">
          <div className="center-note">Lädt…</div>
        </div>
      </div>
    )
  }

  if (!session) return <Login />

  if (!member) return <MemberClaim />

  return (
    <ToastProvider>
      <div className="frame">
        <div className="screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/abende" element={<Abende />} />
            <Route path="/abende/:id" element={<AbendRoute />} />
            <Route path="/meisterschaft" element={<Meisterschaft />} />
            <Route path="/statistik" element={<Statistik />} />
            <Route path="/finanzen" element={<Finanzen />} />
            <Route path="/einstellungen" element={<Einstellungen />} />
            <Route path="/strafen" element={<Strafen />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <TabBar />
      </div>
    </ToastProvider>
  )
}
