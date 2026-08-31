/**
 * Five things, and nothing else:
 *
 *   Building    — an address
 *   Unit        — a door inside it
 *   Todo        — something that needs doing, and where
 *   Entry       — a dated note with photos, on a unit
 *   Inspection  — one walk of a building: a short checklist, photos of what's
 *                 wrong, and a date. Filing it drops it into the building's
 *                 history so this week can be held against last week.
 */

export interface Building {
  id: string
  address: string
  notes: string
  createdAt: string
}

export interface Unit {
  id: string
  buildingId: string
  label: string
  /** Who's behind the door — the thing you want before you knock. */
  tenantName: string
  tenantPhone: string
  notes: string
}

export interface Todo {
  id: string
  title: string
  buildingId: string | null
  unitId: string | null
  done: boolean
  dueDate: string
  photoIds: string[]
  createdAt: string
  doneAt: string | null
}

export interface Entry {
  id: string
  body: string
  buildingId: string | null
  unitId: string | null
  photoIds: string[]
  createdAt: string
}

export type CheckStatus = 'pending' | 'ok' | 'problem'

export interface CheckItem {
  id: string
  label: string
  status: CheckStatus
  note: string
  photoIds: string[]
}

export interface Inspection {
  id: string
  buildingId: string
  items: CheckItem[]
  /** Anything that doesn't belong to one checklist line. */
  note: string
  photoIds: string[]
  startedAt: string
  /**
   * The day you were actually in the building, YYYY-MM-DD. Defaults to the day
   * the visit was started but stays editable, because a walk on Monday often
   * doesn't get written up until Wednesday.
   */
  visitDate: string
  /** null while it's still the open walk; set when filed to history. */
  filedAt: string | null
}

/** What a fresh walk starts with. Editable per building once it's running. */
export const DEFAULT_CHECKS = ['Main areas', 'Boiler', 'Basement', 'Smoke detectors']

export interface Database {
  version: number
  buildings: Building[]
  units: Unit[]
  todos: Todo[]
  entries: Entry[]
  inspections: Inspection[]
}
