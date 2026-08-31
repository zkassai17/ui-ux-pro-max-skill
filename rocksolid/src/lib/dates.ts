/** All dates in this app are stored as `YYYY-MM-DD` strings in local time. */

export function todayISO(): string {
  return toISO(new Date())
}

export function toISO(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** Parse `YYYY-MM-DD` as a local-midnight Date, avoiding UTC drift. */
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** Whole days from today until `iso`. Negative means overdue. */
export function daysUntil(iso: string): number {
  if (!iso) return Infinity
  const today = fromISO(todayISO()).getTime()
  const target = fromISO(iso).getTime()
  return Math.round((target - today) / 86_400_000)
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function addYears(iso: string, n: number): string {
  const d = fromISO(iso)
  d.setFullYear(d.getFullYear() + n)
  return toISO(d)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  return fromISO(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function formatShort(iso: string): string {
  if (!iso) return '—'
  return fromISO(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatStamp(isoDateTime: string): string {
  const d = new Date(isoDateTime)
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
}

/** "3 days ago", "in 2 weeks" — for countdowns that need to read fast. */
export function relativeDays(n: number): string {
  if (!Number.isFinite(n)) return 'no date'
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return '1 day overdue'
  if (n < 0) return `${Math.abs(n)} days overdue`
  if (n < 30) return `in ${n} days`
  if (n < 365) return `in ${Math.round(n / 30)} mo`
  return `in ${(n / 365).toFixed(1)} yr`
}

export const YEARS_PER_RECURRENCE: Record<string, number> = {
  once: 0, annual: 1, biennial: 2, triennial: 3,
  quadrennial: 4, quinquennial: 5, decennial: 10,
}

/** NYC heat season: landlords must maintain heat Oct 1 – May 31. */
export function isHeatSeason(d = new Date()): boolean {
  const m = d.getMonth() + 1
  return m >= 10 || m <= 5
}

export function heatSeasonLabel(d = new Date()): string {
  const y = d.getFullYear()
  const startYear = d.getMonth() + 1 >= 10 ? y : y - 1
  return `Heat season ${startYear}–${startYear + 1}`
}
