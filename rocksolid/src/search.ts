import type { Database } from './types'
import { formatDate } from './lib/dates'

export type HitKind = 'building' | 'unit' | 'todo' | 'visit' | 'note'

export interface Hit {
  kind: HitKind
  id: string
  title: string
  /** Where it lives — building, or building · unit. */
  where: string
  /** The matching text, trimmed around the match. */
  snippet: string
  date: string
  href: string
}

const norm = (s: string) => s.toLowerCase()

/** Pull ~90 characters around the match so the reason for the hit is visible. */
function snippet(text: string, q: string): string {
  const at = norm(text).indexOf(q)
  if (at < 0) return text.slice(0, 90)
  const from = Math.max(0, at - 30)
  const to = Math.min(text.length, at + q.length + 60)
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`
}

/**
 * One search across everything written down. Ordered by kind rather than by
 * relevance score: with a few hundred records, knowing whether a hit is a unit
 * or a two-month-old visit matters more than a ranking nobody can see.
 */
export function search(db: Database, query: string): Hit[] {
  const q = norm(query.trim())
  if (q.length < 2) return []

  const hits: Hit[] = []
  const address = (id: string | null) =>
    db.buildings.find((b) => b.id === id)?.address ?? ''
  const unitOf = (id: string | null) => db.units.find((u) => u.id === id)

  for (const b of db.buildings) {
    const hay = `${b.address} ${b.notes}`
    if (norm(hay).includes(q)) {
      hits.push({
        kind: 'building', id: b.id, title: b.address, where: '',
        snippet: norm(b.notes).includes(q) ? snippet(b.notes, q) : '',
        date: '', href: `/buildings/${b.id}`,
      })
    }
  }

  for (const u of db.units) {
    const hay = `${u.label} ${u.tenantName} ${u.tenantPhone} ${u.notes}`
    if (norm(hay).includes(q)) {
      hits.push({
        kind: 'unit', id: u.id,
        title: u.tenantName ? `${u.label} — ${u.tenantName}` : u.label,
        where: address(u.buildingId),
        snippet: norm(u.notes).includes(q) ? snippet(u.notes, q) : '',
        date: '', href: `/units/${u.id}`,
      })
    }
  }

  for (const t of db.todos) {
    if (!norm(t.title).includes(q)) continue
    const u = unitOf(t.unitId)
    hits.push({
      kind: 'todo', id: t.id, title: t.title,
      where: [address(t.buildingId), u?.label].filter(Boolean).join(' · '),
      snippet: t.done ? 'Done' : '',
      date: t.dueDate ? formatDate(t.dueDate) : '',
      href: t.unitId ? `/units/${t.unitId}` : t.buildingId ? `/buildings/${t.buildingId}` : '/todo',
    })
  }

  for (const e of db.entries) {
    if (!norm(e.body).includes(q)) continue
    const u = unitOf(e.unitId)
    hits.push({
      kind: 'note', id: e.id, title: u ? `Note at ${u.label}` : 'Note',
      where: [address(e.buildingId ?? u?.buildingId ?? null), u?.label].filter(Boolean).join(' · '),
      snippet: snippet(e.body, q),
      date: formatDate(e.createdAt.slice(0, 10)),
      href: e.unitId ? `/units/${e.unitId}` : `/buildings/${e.buildingId}`,
    })
  }

  for (const i of db.inspections) {
    if (!i.filedAt) continue
    // A visit matches on its own note or on any checklist line's label or note.
    const line = i.items.find((c) => norm(`${c.label} ${c.note}`).includes(q))
    const inNote = norm(i.note).includes(q)
    if (!line && !inNote) continue
    hits.push({
      kind: 'visit', id: i.id,
      title: line ? line.label : 'Visit',
      where: address(i.buildingId),
      snippet: line && norm(line.note).includes(q) ? snippet(line.note, q)
        : inNote ? snippet(i.note, q)
        : line?.note || '',
      date: formatDate(i.visitDate),
      href: `/buildings/${i.buildingId}/history`,
    })
  }

  const order: Record<HitKind, number> = { unit: 0, todo: 1, visit: 2, note: 3, building: 4 }
  return hits.sort((a, b) => {
    if (order[a.kind] !== order[b.kind]) return order[a.kind] - order[b.kind]
    return b.date.localeCompare(a.date)
  })
}

export const KIND_LABEL: Record<HitKind, string> = {
  building: 'Building', unit: 'Unit', todo: 'To do', visit: 'Visit', note: 'Note',
}
