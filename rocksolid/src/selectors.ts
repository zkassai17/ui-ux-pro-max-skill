import type { CheckItem, Database, Entry, Inspection, Todo, Unit } from './types'
import { daysUntil } from './lib/dates'

export const buildingAddress = (db: Database, id: string | null): string =>
  id ? db.buildings.find((b) => b.id === id)?.address ?? 'Unknown building' : ''

export const unitLabel = (db: Database, id: string | null): string =>
  id ? db.units.find((u) => u.id === id)?.label ?? '' : ''

/** "303 W 116th St · 3B" — the one line that says where something is. */
export function placeLabel(db: Database, buildingId: string | null, unitId: string | null): string {
  const b = buildingAddress(db, buildingId)
  const u = unitLabel(db, unitId)
  if (b && u) return `${b} · ${u}`
  return b || u || 'No place'
}

export function unitsFor(db: Database, buildingId: string): Unit[] {
  return db.units
    .filter((u) => u.buildingId === buildingId)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
}

export function entriesFor(db: Database, buildingId: string | null, unitId: string | null): Entry[] {
  return db.entries
    .filter((e) => (unitId ? e.unitId === unitId : e.buildingId === buildingId && !e.unitId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Overdue first, then dated, then undated — the order you'd work them in. */
export function sortTodos(todos: Todo[]): Todo[] {
  return [...todos].sort((a, b) => {
    const ad = a.dueDate ? daysUntil(a.dueDate) : Infinity
    const bd = b.dueDate ? daysUntil(b.dueDate) : Infinity
    if (ad !== bd) return ad - bd
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export const openTodos = (db: Database) => sortTodos(db.todos.filter((t) => !t.done))

// ---------- Inspections ----------

export const currentInspection = (db: Database, buildingId: string): Inspection | undefined =>
  db.inspections.find((i) => i.buildingId === buildingId && !i.filedAt)

/** Filed walks, newest first — the building's history. */
export const inspectionHistory = (db: Database, buildingId: string): Inspection[] =>
  db.inspections
    .filter((i) => i.buildingId === buildingId && i.filedAt)
    // Ordered by the day you were there, not the day you wrote it up.
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate))

export const problemCount = (i: Inspection): number =>
  i.items.filter((c) => c.status === 'problem').length

export const checkedCount = (i: Inspection): number =>
  i.items.filter((c) => c.status !== 'pending').length

/**
 * One checklist line traced back through every filed walk — the view that
 * answers whether a problem is clearing up or still there every week.
 */
export function itemTimeline(
  db: Database, buildingId: string, label: string,
): { at: string; item: CheckItem }[] {
  const key = label.trim().toLowerCase()
  return inspectionHistory(db, buildingId)
    .flatMap((i) => i.items
      .filter((c) => c.label.trim().toLowerCase() === key)
      .map((item) => ({ at: i.visitDate, item })))
}

/** Every distinct checklist line this building has ever used. */
export function checkLabels(db: Database, buildingId: string): string[] {
  const seen = new Map<string, string>()
  for (const i of db.inspections.filter((x) => x.buildingId === buildingId)) {
    for (const c of i.items) {
      const k = c.label.trim().toLowerCase()
      if (k && !seen.has(k)) seen.set(k, c.label)
    }
  }
  return [...seen.values()]
}
