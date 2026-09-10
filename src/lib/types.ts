export type Role = 'admin' | 'kassenwart' | 'mitglied'
export type EveningStatus = 'entwurf' | 'kontrolle' | 'freigegeben'
export type PenaltyKat = 'pudel' | 'c10' | 'c50' | 'c100'
export type VerlaufTyp = 'strafe' | 'sonstige' | 'getraenke' | 'beitrag' | 'zahlung'

export interface Member {
  id: string
  user_id: string | null
  name: string
  avatar_url: string | null
  geburtstag: string | null
  role: Role
  created_at: string
}

export interface ClubEvening {
  id: string
  datum: string
  ort: string | null
  ersteller_id: string | null
  status: EveningStatus
  released_at: string | null
  created_at: string
}

export interface Attendance {
  evening_id: string
  member_id: string
  anwesend: boolean
}

export interface Penalty {
  id: string
  evening_id: string
  member_id: string
  kategorie: PenaltyKat
  anzahl: number
}

export interface SonstigeStrafe {
  id: string
  evening_id: string
  member_id: string
  grund: string
  betrag: number
}

export interface EveningCosts {
  evening_id: string
  kegelbahnkosten: number
  getraenkekosten: number
}

export interface ChampionshipPoint {
  id: string
  evening_id: string
  member_id: string
  punkte: number
}

export interface VerlaufRow {
  id: string
  member_id: string
  datum: string
  label: string
  betrag: number
  typ: VerlaufTyp
  evening_id: string | null
  created_at: string
}

export interface ClubTransaction {
  id: string
  datum: string
  bezeichnung: string
  einnahmen: number
  ausgaben: number
  created_by: string | null
  created_at: string
}

export interface AppSettings {
  id: boolean
  paypalme_handle: string | null
  termin_rhythmus_wochen: number
}

export const PREISE: Record<PenaltyKat, number> = {
  pudel: 0.1,
  c10: 0.1,
  c50: 0.5,
  c100: 1.0,
}

export const KAT_LABEL: Record<PenaltyKat, string> = {
  pudel: 'Pudel',
  c10: '10 ¢',
  c50: '50 ¢',
  c100: '1 €',
}
