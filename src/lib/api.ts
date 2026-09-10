import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type {
  AppSettings,
  Attendance,
  ChampionshipPoint,
  ClubEvening,
  EveningCosts,
  Member,
  Penalty,
  PenaltyKat,
  SonstigeStrafe,
  VerlaufRow,
} from './types'
import { PREISE } from './types'

async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p
  if (error) throw error
  return data as T
}

// ---------- reads ----------

export function useMembers() {
  return useQuery({
    queryKey: ['members'],
    queryFn: () =>
      must<Member[]>(supabase.from('members').select('*').order('name')),
  })
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () =>
      must<AppSettings>(supabase.from('app_settings').select('*').single()),
  })
}

export function useEvenings() {
  return useQuery({
    queryKey: ['evenings'],
    queryFn: () =>
      must<ClubEvening[]>(
        supabase.from('club_evenings').select('*').order('datum', { ascending: false }),
      ),
  })
}

export interface EveningDetail {
  evening: ClubEvening
  attendance: Attendance[]
  penalties: Penalty[]
  sonstige: SonstigeStrafe[]
  costs: EveningCosts | null
  points: ChampionshipPoint[]
}

export function useEvening(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['evening', id],
    queryFn: async (): Promise<EveningDetail> => {
      const [evening, attendance, penalties, sonstige, costs, points] = await Promise.all([
        must<ClubEvening>(supabase.from('club_evenings').select('*').eq('id', id).single()),
        must<Attendance[]>(supabase.from('attendance').select('*').eq('evening_id', id)),
        must<Penalty[]>(supabase.from('penalties').select('*').eq('evening_id', id)),
        must<SonstigeStrafe[]>(
          supabase.from('sonstige_strafen').select('*').eq('evening_id', id),
        ),
        supabase
          .from('evening_costs')
          .select('*')
          .eq('evening_id', id)
          .maybeSingle()
          .then((r) => {
            if (r.error) throw r.error
            return r.data as EveningCosts | null
          }),
        must<ChampionshipPoint[]>(
          supabase.from('championship_points').select('*').eq('evening_id', id),
        ),
      ])
      return { evening, attendance, penalties, sonstige, costs, points }
    },
  })
}

export function useAllPoints() {
  return useQuery({
    queryKey: ['points'],
    queryFn: () =>
      must<(ChampionshipPoint & { club_evenings: { datum: string; status: string } })[]>(
        supabase
          .from('championship_points')
          .select('*, club_evenings(datum, status)'),
      ),
  })
}

export function useAllPenalties() {
  return useQuery({
    queryKey: ['penalties-all'],
    queryFn: () =>
      must<(Penalty & { club_evenings: { datum: string; status: string } })[]>(
        supabase.from('penalties').select('*, club_evenings(datum, status)'),
      ),
  })
}

export function useAllAttendance() {
  return useQuery({
    queryKey: ['attendance-all'],
    queryFn: () =>
      must<(Attendance & { club_evenings: { datum: string; status: string } })[]>(
        supabase.from('attendance').select('*, club_evenings(datum, status)'),
      ),
  })
}

export function useVerlauf() {
  return useQuery({
    queryKey: ['verlauf'],
    queryFn: () =>
      must<VerlaufRow[]>(
        supabase.from('verlauf').select('*').order('datum', { ascending: false }),
      ),
  })
}

// ---------- derived helpers ----------

/** current outstanding balance ("Rückstand") per member id, from the ledger */
export function rueckstandByMember(verlauf: VerlaufRow[]): Record<string, number> {
  const acc: Record<string, number> = {}
  for (const v of verlauf) acc[v.member_id] = (acc[v.member_id] ?? 0) + Number(v.betrag)
  for (const k of Object.keys(acc)) acc[k] = Math.round(acc[k] * 100) / 100
  return acc
}

export function matrixSum(p: { kategorie: PenaltyKat; anzahl: number }[]): number {
  return p.reduce((s, x) => s + x.anzahl * PREISE[x.kategorie], 0)
}

// ---------- writes ----------

export function useCreateEvening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { datum: string; ort?: string; ersteller_id: string | null }) => {
      const ev = await must<ClubEvening>(
        supabase
          .from('club_evenings')
          .insert({ datum: input.datum, ort: input.ort ?? null, ersteller_id: input.ersteller_id })
          .select()
          .single(),
      )
      // seed attendance rows (all present) + empty costs
      const members = await must<Member[]>(supabase.from('members').select('id'))
      await must(
        supabase
          .from('attendance')
          .insert(members.map((m) => ({ evening_id: ev.id, member_id: m.id, anwesend: true }))),
      )
      await must(supabase.from('evening_costs').insert({ evening_id: ev.id }))
      return ev
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['evenings'] }),
  })
}

export interface DraftRowInput {
  member_id: string
  anwesend: boolean
  penalties: Record<PenaltyKat, number>
  punkte: number
  sonstige: { grund: string; betrag: number }[]
}

export function useSaveDraft(eveningId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      rows: DraftRowInput[]
      kegelbahnkosten: number
      getraenkekosten: number
    }) => {
      const { rows } = input

      await must(
        supabase
          .from('attendance')
          .upsert(
            rows.map((r) => ({
              evening_id: eveningId,
              member_id: r.member_id,
              anwesend: r.anwesend,
            })),
            { onConflict: 'evening_id,member_id' },
          ),
      )

      const penaltyRows = rows.flatMap((r) =>
        (Object.keys(r.penalties) as PenaltyKat[]).map((kat) => ({
          evening_id: eveningId,
          member_id: r.member_id,
          kategorie: kat,
          anzahl: r.penalties[kat] || 0,
        })),
      )
      await must(
        supabase
          .from('penalties')
          .upsert(penaltyRows, { onConflict: 'evening_id,member_id,kategorie' }),
      )

      // championship points: only present members
      const pointRows = rows
        .filter((r) => r.anwesend)
        .map((r) => ({ evening_id: eveningId, member_id: r.member_id, punkte: r.punkte || 0 }))
      await must(
        supabase
          .from('championship_points')
          .upsert(pointRows, { onConflict: 'evening_id,member_id' }),
      )
      const absentIds = rows.filter((r) => !r.anwesend).map((r) => r.member_id)
      if (absentIds.length) {
        await must(
          supabase
            .from('championship_points')
            .delete()
            .eq('evening_id', eveningId)
            .in('member_id', absentIds),
        )
      }

      // sonstige: wipe + reinsert (simplest consistent approach)
      await must(supabase.from('sonstige_strafen').delete().eq('evening_id', eveningId))
      const sonstigeRows = rows.flatMap((r) =>
        r.sonstige
          .filter((s) => s.grund.trim() !== '' || s.betrag !== 0)
          .map((s) => ({
            evening_id: eveningId,
            member_id: r.member_id,
            grund: s.grund.trim() || 'Sonstige Strafe',
            betrag: s.betrag,
          })),
      )
      if (sonstigeRows.length) {
        await must(supabase.from('sonstige_strafen').insert(sonstigeRows))
      }

      await must(
        supabase.from('evening_costs').upsert(
          {
            evening_id: eveningId,
            kegelbahnkosten: input.kegelbahnkosten,
            getraenkekosten: input.getraenkekosten,
          },
          { onConflict: 'evening_id' },
        ),
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evening', eveningId] })
    },
  })
}

export function useSetEveningStatus(eveningId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (status: 'entwurf' | 'kontrolle') =>
      must(supabase.from('club_evenings').update({ status }).eq('id', eveningId)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evening', eveningId] })
      qc.invalidateQueries({ queryKey: ['evenings'] })
    },
  })
}

export function useReleaseEvening(eveningId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('release_evening', { p_evening: eveningId })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })
}

export function useConfirmPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { member_id: string; betrag: number }) =>
      must(
        supabase.from('verlauf').insert({
          member_id: input.member_id,
          datum: new Date().toISOString().slice(0, 10),
          label: 'Zahlung',
          betrag: -Math.abs(input.betrag),
          typ: 'zahlung',
        }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verlauf'] }),
  })
}

export function useBookMitgliedsgebuehr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { betrag: number }) => {
      const datum = new Date().toISOString().slice(0, 10)
      const members = await must<Member[]>(supabase.from('members').select('id'))
      await must(
        supabase
          .from('mitgliedsgebuehren')
          .insert(members.map((m) => ({ datum, betrag: input.betrag, member_id: m.id }))),
      )
      await must(
        supabase.from('verlauf').insert(
          members.map((m) => ({
            member_id: m.id,
            datum,
            label: 'Mitgliedsbeitrag',
            betrag: input.betrag,
            typ: 'beitrag' as const,
          })),
        ),
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['verlauf'] }),
  })
}

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<AppSettings>) =>
      must(supabase.from('app_settings').update(patch).eq('id', true)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  })
}

export function useAddMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { name: string; geburtstag?: string }) =>
      must(
        supabase
          .from('members')
          .insert({ name: input.name, geburtstag: input.geburtstag ?? null }),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}

export function useDemoData() {
  const qc = useQueryClient()
  const seed = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('seed_demo_data')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries(),
  })
  const wipe = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('wipe_demo_data')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries(),
  })
  return { seed, wipe }
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => must(supabase.from('members').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  })
}
