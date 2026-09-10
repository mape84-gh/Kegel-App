import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Member, Role } from '../lib/types'

interface AuthState {
  session: Session | null
  member: Member | null
  role: Role | null
  isStaff: boolean
  loading: boolean
  signOut: () => Promise<void>
  refreshMember: () => Promise<void>
}

const Ctx = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadMember(userId: string | undefined) {
    if (!userId) {
      setMember(null)
      return
    }
    const { data } = await supabase.from('members').select('*').eq('user_id', userId).maybeSingle()
    setMember((data as Member) ?? null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadMember(data.session?.user.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      loadMember(s?.user.id)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value: AuthState = {
    session,
    member,
    role: member?.role ?? null,
    isStaff: member?.role === 'admin' || member?.role === 'kassenwart',
    loading,
    signOut: async () => {
      await supabase.auth.signOut()
    },
    refreshMember: () => loadMember(session?.user.id),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth outside AuthProvider')
  return v
}
