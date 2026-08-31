import { useSyncExternalStore } from 'react'
import type { Database } from './types'
import { emptyDatabase } from './seed'
import { DEFAULT_TEMPLATES } from './catalog'

const KEY = 'rocksolid.db.v1'

const listeners = new Set<() => void>()
let db: Database = load()

function load(): Database {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDatabase()
    const parsed = JSON.parse(raw) as Partial<Database>
    // Merge onto a fresh shape so a database written by an older build still
    // opens after new collections are added.
    const base = emptyDatabase()
    return {
      ...base,
      ...parsed,
      version: 1,
      templates: parsed.templates?.length ? parsed.templates : structuredClone(DEFAULT_TEMPLATES),
    }
  } catch {
    return emptyDatabase()
  }
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
