import { useSyncExternalStore } from 'react'
import type { Building, Database, Entry, Todo, Unit } from './types'
import { PORTFOLIO_BUILDINGS, PORTFOLIO_UNITS, PORTFOLIO_VERSION } from './portfolio'
import { uid } from './lib/id'

/** Marks a building note as already carrying the city tax-lot record. */
const VERIFIED_MARKER = 'NYC PLUTO'

const KEY = 'rocksolid.db.v1'
const SEED_KEY = 'rocksolid.seed'

export function emptyDatabase(): Database {
  return { version: 2, buildings: [], units: [], todos: [], entries: [] }
}

const listeners = new Set<() => void>()
let saveFailed = false

/**
 * Earlier versions modelled compliance filings, arrears, walkthroughs, leases
 * and a four-state task workflow. That was more app than the job needed. This
 * pulls the parts worth keeping out of any older database — buildings, units,
 * whatever was on the task list, and every dated note and photo — and reads
 * defensively, because stored JSON is not to be trusted to have a shape.
 */
type Row = Record<string, unknown>
const str = (v: unknown, fallback = '') => (typeof v === 'string' ? v : fallback)
const rows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : [])
const ids = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') as string[] : [])
const ref = (v: unknown): string | null => (typeof v === 'string' ? v : null)

function migrate(input: unknown): Database {
  const d = (input ?? {}) as Row

  if (d.version === 2 && Array.isArray(d.buildings)) {
    return { ...emptyDatabase(), ...(d as unknown as Database) }
  }

  const stamp = () => new Date().toISOString()

  const buildings: Building[] = rows(d.properties).map((p) => ({
    id: str(p.id),
    address: (str(p.address) || str(p.name) || 'Untitled').trim(),
    notes: str(p.notes),
    createdAt: str(p.createdAt, stamp()),
  }))

  const units: Unit[] = rows(d.units).map((u) => ({
    id: str(u.id),
    buildingId: str(u.propertyId) || str(u.buildingId),
    label: str(u.label),
    tenantName: str(u.tenantName),
    tenantPhone: str(u.tenantPhone),
    notes: str(u.notes),
  }))

  const todos: Todo[] = rows(d.tasks).map((t) => ({
    id: str(t.id),
    title: str(t.title),
    buildingId: ref(t.propertyId),
    unitId: ref(t.unitId),
    done: t.status === 'done',
    dueDate: str(t.dueDate),
    photoIds: ids(t.photoIds),
    createdAt: str(t.createdAt, stamp()),
    doneAt: ref(t.completedAt),
  }))

  // Old task threads were dated notes in their own right — keep them.
  const fromThreads: Entry[] = rows(d.tasks).flatMap((t) =>
    rows(t.thread).map((e) => ({
      id: str(e.id),
      body: str(e.body),
      buildingId: ref(t.propertyId),
      unitId: ref(t.unitId),
      photoIds: ids(e.photoIds),
      createdAt: str(e.at, stamp()),
    })),
  )

  const fromNotes: Entry[] = rows(d.notes).map((n) => ({
    id: str(n.id),
    body: str(n.body),
    buildingId: ref(n.propertyId),
    unitId: ref(n.unitId),
    photoIds: ids(n.photoIds),
    createdAt: str(n.createdAt, stamp()),
  }))

  const entries = [...fromNotes, ...fromThreads]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return { version: 2, buildings, units, todos, entries }
}

function seeded(): Database {
  return {
    ...emptyDatabase(),
    buildings: structuredClone(PORTFOLIO_BUILDINGS),
    units: structuredClone(PORTFOLIO_UNITS),
  }
}

function load(): Database {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return emptyDatabase()   // storage blocked entirely
  }

  if (!raw) {
    const fresh = seeded()
    try {
      localStorage.setItem(KEY, JSON.stringify(fresh))
      localStorage.setItem(SEED_KEY, String(PORTFOLIO_VERSION))
    } catch { /* private mode */ }
    return fresh
  }

  let migrated: Database
  try {
    migrated = migrate(JSON.parse(raw))
  } catch (err) {
    // Never silently start empty on top of a database that exists — that reads
    // as data loss. Keep the raw copy so it can be recovered.
    console.error('Could not read the saved database; starting empty.', err)
    try { localStorage.setItem(`${KEY}.unreadable`, raw) } catch { /* full */ }
    return emptyDatabase()
  }

  // Persist the converted shape so the old one stops being re-parsed.
  try { localStorage.setItem(KEY, JSON.stringify(migrated)) } catch { /* full */ }
  return migrated
}

let db: Database = load()

/**
 * A device that opened the app before only has whatever the portfolio held at
 * the time. Rather than making that the user's problem, top it up on load —
 * reseed only ever fills gaps, so this cannot clobber anything.
 */
try {
  const seen = Number(localStorage.getItem(SEED_KEY) ?? '0')
  if (seen < PORTFOLIO_VERSION) {
    reseed()
    localStorage.setItem(SEED_KEY, String(PORTFOLIO_VERSION))
  }
} catch { /* storage blocked — the manual Sync button still works */ }

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
    saveFailed = false
  } catch {
    saveFailed = true
  }
}

export const didSaveFail = () => saveFailed

function emit() { for (const l of listeners) l() }
function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
function snapshot() { return db }

export function useDB(): Database {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

/** Every write goes through here: mutate a clone, save, notify. */
export function mutate(recipe: (draft: Database) => void): void {
  const draft = structuredClone(db)
  recipe(draft)
  db = draft
  persist()
  emit()
}

export function replaceAll(next: Database): void {
  db = migrate(next)
  persist()
  emit()
}

export function readDB(): Database { return db }

export function storageBytes(): number {
  try { return new Blob([localStorage.getItem(KEY) ?? '']).size } catch { return 0 }
}

export interface ReseedReport { buildings: number; units: number; notes: number }

/**
 * Bring a device up to date with the current portfolio.
 *
 * Matching is by address for buildings and by label within a building for
 * units, so this only ever fills gaps: it never duplicates, never renames, and
 * never touches a unit you have already edited. Building notes are appended to
 * rather than replaced, so anything you have written survives.
 */
export function reseed(): ReseedReport {
  const report: ReseedReport = { buildings: 0, units: 0, notes: 0 }
  const norm = (s: string) => s.trim().toLowerCase()

  mutate((d) => {
    const takenIds = new Set([...d.units.map((u) => u.id), ...d.buildings.map((b) => b.id)])
    const freeId = (want: string) => {
      if (!takenIds.has(want)) { takenIds.add(want); return want }
      const alt = uid('u_')
      takenIds.add(alt)
      return alt
    }

    for (const pb of PORTFOLIO_BUILDINGS) {
      let target = d.buildings.find((b) => norm(b.address) === norm(pb.address))

      if (!target) {
        target = structuredClone(pb)
        target.id = freeId(pb.id)
        d.buildings.push(target)
        report.buildings++
      } else if (pb.notes && !target.notes.includes(VERIFIED_MARKER)) {
        // Add the city record without discarding whatever they wrote.
        target.notes = target.notes.trim() ? `${target.notes.trim()}\n\n${pb.notes}` : pb.notes
        report.notes++
      }

      const have = new Set(
        d.units.filter((u) => u.buildingId === target!.id).map((u) => norm(u.label)),
      )
      for (const pu of PORTFOLIO_UNITS.filter((u) => u.buildingId === pb.id)) {
        if (have.has(norm(pu.label))) continue
        d.units.push({ ...structuredClone(pu), id: freeId(pu.id), buildingId: target!.id })
        have.add(norm(pu.label))
        report.units++
      }
    }
  })

  return report
}

export function describeReseed(r: ReseedReport): string {
  const parts: string[] = []
  if (r.buildings) parts.push(`${r.buildings} building${r.buildings === 1 ? '' : 's'}`)
  if (r.units) parts.push(`${r.units} unit${r.units === 1 ? '' : 's'}`)
  if (!parts.length) return r.notes ? 'Updated building details' : 'Everything is already here'
  return `Added ${parts.join(' and ')}`
}
