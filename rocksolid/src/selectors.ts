import type { Database, Entry, Todo, Unit } from './types'
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
