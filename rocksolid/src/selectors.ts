import { daysUntil } from './lib/dates'
import type { ComplianceItem, Database, Task, Unit } from './types'

export type Urgency = 'overdue' | 'today' | 'soon' | 'upcoming' | 'later'

export function urgency(iso: string): Urgency {
  const n = daysUntil(iso)
  if (!Number.isFinite(n)) return 'later'
  if (n < 0) return 'overdue'
  if (n === 0) return 'today'
  if (n <= 7) return 'soon'
  if (n <= 30) return 'upcoming'
  return 'later'
}

export const isOpen = (t: Task) => t.status !== 'done'

/** Compliance that still needs action: not filed, not waived. */
export const isLive = (c: ComplianceItem) => c.status === 'scheduled'

export function propertyName(db: Database, id: string | null): string {
  if (!id) return ''
  return db.properties.find((p) => p.id === id)?.name ?? 'Unknown property'
}

export function unitLabel(db: Database, id: string | null): string {
  if (!id) return ''
  return db.units.find((u) => u.id === id)?.label ?? ''
}

/** "The Chandler · 3B" — the breadcrumb used on cards throughout the app. */
export function locationLabel(db: Database, propertyId: string | null, unitId: string | null): string {
  const p = propertyName(db, propertyId)
  const u = unitLabel(db, unitId)
  if (p && u) return `${p} · ${u}`
  return p || u || 'Unassigned'
}

export function unitsFor(db: Database, propertyId: string): Unit[] {
  return db.units
    .filter((u) => u.propertyId === propertyId)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
}

const PRIORITY_RANK: Record<Task['priority'], number> = {
  emergency: 0, high: 1, normal: 2, low: 3,
}

/** Sort open work the way you triage it: overdue first, then priority, then date. */
export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const ad = a.dueDate ? daysUntil(a.dueDate) : Infinity
    const bd = b.dueDate ? daysUntil(b.dueDate) : Infinity
    const aLate = ad < 0 ? 0 : 1
    const bLate = bd < 0 ? 0 : 1
    if (aLate !== bLate) return aLate - bLate
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    }
    return ad - bd
  })
}

export function sortCompliance(items: ComplianceItem[]): ComplianceItem[] {
  return [...items].sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
}

export interface Attention {
  overdueTasks: Task[]
  dueTodayTasks: Task[]
  weekTasks: Task[]
  overdueCompliance: ComplianceItem[]
  weekCompliance: ComplianceItem[]
  expiringLeases: Unit[]
  arrearsTotal: number
}

/** Everything the Today screen needs, computed in one pass. */
export function attention(db: Database): Attention {
  const open = db.tasks.filter(isOpen)
  const live = db.compliance.filter(isLive)

  return {
    overdueTasks: sortTasks(open.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0)),
    dueTodayTasks: sortTasks(open.filter((t) => t.dueDate && daysUntil(t.dueDate) === 0)),
    weekTasks: sortTasks(open.filter((t) => {
      if (!t.dueDate) return false
      const n = daysUntil(t.dueDate)
      return n > 0 && n <= 7
    })),
    overdueCompliance: sortCompliance(live.filter((c) => daysUntil(c.dueDate) < 0)),
    weekCompliance: sortCompliance(live.filter((c) => {
      const n = daysUntil(c.dueDate)
      return n >= 0 && n <= 14
    })),
    expiringLeases: db.units
      .filter((u) => u.leaseEnd && daysUntil(u.leaseEnd) >= 0 && daysUntil(u.leaseEnd) <= 90)
      .sort((a, b) => daysUntil(a.leaseEnd) - daysUntil(b.leaseEnd)),
    arrearsTotal: db.arrears.reduce((s, a) => s + a.balance, 0),
  }
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}
