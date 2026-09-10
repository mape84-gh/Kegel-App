export function fmtEuro(n: number): string {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** ISO date (yyyy-mm-dd) -> "dd.mm.yyyy" */
export function fmtDateDE(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** "dd.mm.yyyy" -> Date */
export function parseDE(s: string): Date {
  const [d, m, y] = s.split('.').map(Number)
  return new Date(y, m - 1, d)
}

export function fmtLongDE(iso: string): string {
  const dt = new Date(iso + 'T00:00:00')
  return dt.toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
}

export interface BirthdayInfo {
  member: { name: string; geburtstag: string | null }
  days: number
  date: Date
}

export function nextBirthday(
  members: { name: string; geburtstag: string | null }[],
): BirthdayInfo | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let best: BirthdayInfo | null = null
  for (const m of members) {
    if (!m.geburtstag) continue
    const [dd, mm] = m.geburtstag.split('.').map(Number)
    if (!dd || !mm) continue
    let target = new Date(today.getFullYear(), mm - 1, dd)
    if (target < today) target = new Date(today.getFullYear() + 1, mm - 1, dd)
    const days = Math.round((target.getTime() - today.getTime()) / 86400000)
    if (!best || days < best.days) best = { member: m, days, date: target }
  }
  return best
}

export function daysUntil(iso: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(iso + 'T00:00:00')
  return Math.round((target.getTime() - today.getTime()) / 86400000)
}
