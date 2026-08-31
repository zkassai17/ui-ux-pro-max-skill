import { useSyncExternalStore } from 'react'
import type { Database, Property } from './types'
import { emptyDatabase } from './seed'
import { DEFAULT_TEMPLATES } from './catalog'
import {
  PORTFOLIO_COMPLIANCE, PORTFOLIO_NOTES, PORTFOLIO_PROPERTIES,
  PORTFOLIO_TASKS, PORTFOLIO_UNITS,
} from './portfolio'

const KEY = 'rocksolid.db.v1'

const listeners = new Set<() => void>()
let db: Database = load()

/** The managed portfolio, used only when the app has never been opened here. */
function seededDatabase(): Database {
  return {
    ...emptyDatabase(),
    properties: structuredClone(PORTFOLIO_PROPERTIES),
    units: structuredClone(PORTFOLIO_UNITS),
    compliance: structuredClone(PORTFOLIO_COMPLIANCE),
    tasks: structuredClone(PORTFOLIO_TASKS),
    notes: structuredClone(PORTFOLIO_NOTES),
  }
}

function load(): Database {
  try {
    const raw = localStorage.getItem(KEY)
    // First run on this device: open with the real portfolio rather than an
    // empty shell. Written straight back so erasing later stays erased.
    if (!raw) {
      const seeded = seededDatabase()
      try { localStorage.setItem(KEY, JSON.stringify(seeded)) } catch { /* private mode */ }
      return seeded
    }
    const parsed = JSON.parse(raw) as Partial<Database>
    // Merge onto a fresh shape so a database written by an older build still
    // opens after new collections are added.
    const base = emptyDatabase()
    return {
      ...base,
      ...parsed,
      version: 1,
      properties: (parsed.properties ?? []).map(migrateProperty),
      tasks: (parsed.tasks ?? []).map((t) => ({
        ...t,
        thread: (t.thread ?? []).map((e) => ({ ...e, photoIds: e.photoIds ?? [] })),
      })),
      templates: parsed.templates?.length ? parsed.templates : structuredClone(DEFAULT_TEMPLATES),
    }
  } catch {
    return emptyDatabase()
  }
}

/**
 * Buildings used to carry a display name alongside the address. The address is
 * now the identity, so fold any old name in rather than dropping it: it becomes
 * the address when no address was recorded, and is otherwise appended so a
 * building people knew as "The Chandler" is still findable by that word.
 */
function migrateProperty(p: Property & { name?: string }): Property {
  const { name, ...rest } = p
  if (!name) return rest as Property
  const address = rest.address?.trim()
  if (!address) return { ...rest, address: name } as Property
  if (address.toLowerCase().includes(name.trim().toLowerCase())) return rest as Property
  return { ...rest, address: `${address} (${name})` } as Property
}

let saveFailed = false

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
    saveFailed = false
  } catch {
    saveFailed = true
  }
}

export function didSaveFail() {
  return saveFailed
}

function emit() {
  for (const l of listeners) l()
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

function snapshot() {
  return db
}

/** Read the database inside a component. Re-renders on every mutation. */
export function useDB(): Database {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/**
 * Apply a change. The recipe mutates a structural clone, so React always sees a
 * fresh top-level reference and every mutation is atomic.
 */
export function mutate(recipe: (draft: Database) => void): void {
  const draft = structuredClone(db)
  recipe(draft)
  db = draft
  persist()
  emit()
}

export function replaceAll(next: Database): void {
  db = { ...emptyDatabase(), ...next, version: 1 }
  persist()
  emit()
}

export function readDB(): Database {
  return db
}

export function storageBytes(): number {
  try {
    return new Blob([localStorage.getItem(KEY) ?? '']).size
  } catch {
    return 0
  }
}
