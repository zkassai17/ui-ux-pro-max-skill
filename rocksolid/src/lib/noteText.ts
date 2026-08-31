import type { Database, Note, Walkthrough, WalkthroughTemplate } from '../types'
import { locationLabel } from '../selectors'
import { formatDate, formatStamp } from '../lib/dates'

/** One note, formatted for a message: where, when, then what. */
export function noteToText(db: Database, n: Note): string {
  const where = locationLabel(db, n.propertyId, n.unitId)
  const head = [where !== 'Unassigned' ? where : null, formatStamp(n.createdAt)]
    .filter(Boolean).join(' · ')
  return `${head}\n\n${n.body}`.trim()
}

/** A batch of notes, newest first, separated so they stay readable in a text. */
export function notesToText(db: Database, notes: Note[]): string {
  if (notes.length === 1) return noteToText(db, notes[0])
  const body = notes.map((n) => {
    const where = locationLabel(db, n.propertyId, n.unitId)
    const head = [where !== 'Unassigned' ? where : null, formatStamp(n.createdAt)]
      .filter(Boolean).join(' · ')
    return `• ${head}\n${n.body}`
  }).join('\n\n')
  return `Notes (${notes.length})\n\n${body}`
}

/** A walkthrough summary: the count, then the issues, which is what gets read. */
export function walkthroughToText(
  db: Database, w: Walkthrough, tpl: WalkthroughTemplate | undefined,
): string {
  const address = db.properties.find((p) => p.id === w.propertyId)?.address ?? 'Unknown building'
  const labelFor = (itemId: string) =>
    tpl?.sections.flatMap((s) => s.items).find((i) => i.id === itemId)?.label ?? itemId

  const checked = w.results.filter((r) => r.status !== 'pending').length
  const issues = w.results.filter((r) => r.status === 'issue')

  const lines = [
    `${w.templateName} — ${address}`,
    formatDate(w.date),
    '',
    `${checked} of ${w.results.length} checked · ${issues.length} issue${issues.length === 1 ? '' : 's'}`,
  ]

  if (issues.length) {
    // Checklist items are written as positive assertions ("Exterior lighting
    // working"), so listing them bare under a heading inverts their meaning to
    // whoever receives the text. Every line says FAILED explicitly.
    lines.push('', `ISSUES (${issues.length})`)
    for (const r of issues) {
      lines.push(`• FAILED: ${labelFor(r.itemId)}${r.note ? ` — ${r.note}` : ''}`)
    }
  } else if (checked > 0) {
    lines.push('', 'No issues found.')
  }

  if (w.overallNote.trim()) lines.push('', 'NOTES', w.overallNote.trim())

  return lines.join('\n')
}
