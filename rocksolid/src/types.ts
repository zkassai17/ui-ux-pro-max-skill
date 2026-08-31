/**
 * Four things, and nothing else:
 *
 *   Building  — an address
 *   Unit      — a door inside it
 *   Todo      — something that needs doing, and where
 *   Entry     — a dated note with photos, on a building or a unit
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

export interface Database {
  version: number
  buildings: Building[]
  units: Unit[]
  todos: Todo[]
  entries: Entry[]
}
