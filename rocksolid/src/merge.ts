import { mutate } from './store'
import type { Database } from './types'

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

export interface MergeReport {
  properties: number
  units: number
  tasks: number
  notes: number
  compliance: number
  walkthroughs: number
  arrears: number
  skipped: number
}

/**
 * Fold an imported database into the current one instead of replacing it.
 *
 * Buildings are matched on address, so importing a list that overlaps what you
 * already have adds only what is new. Child records follow their building
 * across that match, and anything already present by id is left alone.
 */
export function mergeDatabase(incoming: Database): MergeReport {
  const report: MergeReport = {
    properties: 0, units: 0, tasks: 0, notes: 0,
    compliance: 0, walkthroughs: 0, arrears: 0, skipped: 0,
  }

  mutate((d) => {
    // incoming property id -> the id it should use in the merged database
    const propertyId = new Map<string, string>()

    for (const p of incoming.properties ?? []) {
      const match = d.properties.find((x) => norm(x.address) === norm(p.address))
      if (match) {
        propertyId.set(p.id, match.id)
        report.skipped++
      } else {
        propertyId.set(p.id, p.id)
        d.properties.push(p)
        report.properties++
      }
    }

    const remapProp = (id: string | null) => (id ? propertyId.get(id) ?? id : null)

    // incoming unit id -> merged unit id
    const unitId = new Map<string, string>()

    for (const u of incoming.units ?? []) {
      const pid = remapProp(u.propertyId) ?? u.propertyId
      const match = d.units.find((x) => x.propertyId === pid && norm(x.label) === norm(u.label))
      if (match) {
        unitId.set(u.id, match.id)
        report.skipped++
      } else {
        unitId.set(u.id, u.id)
        d.units.push({ ...u, propertyId: pid })
        report.units++
      }
    }

    const remapUnit = (id: string | null) => (id ? unitId.get(id) ?? id : null)

    for (const t of incoming.tasks ?? []) {
      if (d.tasks.some((x) => x.id === t.id)) { report.skipped++; continue }
      d.tasks.push({ ...t, propertyId: remapProp(t.propertyId), unitId: remapUnit(t.unitId) })
      report.tasks++
    }

    for (const n of incoming.notes ?? []) {
      if (d.notes.some((x) => x.id === n.id)) { report.skipped++; continue }
      d.notes.push({ ...n, propertyId: remapProp(n.propertyId), unitId: remapUnit(n.unitId) })
      report.notes++
    }

    for (const c of incoming.compliance ?? []) {
      if (d.compliance.some((x) => x.id === c.id)) { report.skipped++; continue }
      d.compliance.push({ ...c, propertyId: remapProp(c.propertyId) ?? c.propertyId })
      report.compliance++
    }

    for (const w of incoming.walkthroughs ?? []) {
      if (d.walkthroughs.some((x) => x.id === w.id)) { report.skipped++; continue }
      d.walkthroughs.push({ ...w, propertyId: remapProp(w.propertyId) ?? w.propertyId })
      report.walkthroughs++
    }

    for (const a of incoming.arrears ?? []) {
      const uid = remapUnit(a.unitId) ?? a.unitId
      if (d.arrears.some((x) => x.unitId === uid)) { report.skipped++; continue }
      d.arrears.push({ ...a, unitId: uid, propertyId: remapProp(a.propertyId) ?? a.propertyId })
      report.arrears++
    }

    for (const t of incoming.templates ?? []) {
      if (!d.templates.some((x) => x.id === t.id)) d.templates.push(t)
    }

    d.notes.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  })

  return report
}

export function describeReport(r: MergeReport): string {
  const parts: string[] = []
  if (r.properties) parts.push(`${r.properties} building${r.properties === 1 ? '' : 's'}`)
  if (r.units) parts.push(`${r.units} unit${r.units === 1 ? '' : 's'}`)
  if (r.tasks) parts.push(`${r.tasks} task${r.tasks === 1 ? '' : 's'}`)
  if (r.notes) parts.push(`${r.notes} note${r.notes === 1 ? '' : 's'}`)
  if (r.compliance) parts.push(`${r.compliance} filing${r.compliance === 1 ? '' : 's'}`)
  if (r.arrears) parts.push(`${r.arrears} arrears`)
  const added = parts.length ? `Added ${parts.join(', ')}` : 'Nothing new to add'
  return r.skipped ? `${added} · ${r.skipped} already here` : added
}
