import { useMemo, useState } from 'react'
import type { ComplianceItem, Database } from '../types'
import { COMPLIANCE_PRESETS } from '../catalog'
import {
  deleteCompliance, markComplianceFiled, newCompliance, saveCompliance,
} from '../actions'
import { sortCompliance } from '../selectors'
import { addYears, daysUntil, formatDate, todayISO, toISO } from '../lib/dates'
import { AGENCY, opts, RECURRENCE } from '../labels'
import {
  Badge, ConfirmButton, Empty, Field, Modal, SectionHead, Select, TextArea, TextInput,
} from '../components/ui'
import { ComplianceRow } from '../components/rows'

type Lens = 'live' | 'overdue' | 'violations' | 'filed'

export function Compliance({ db }: { db: Database }) {
  const [lens, setLens] = useState<Lens>('live')
  const [propertyId, setPropertyId] = useState('')
  const [editing, setEditing] = useState<ComplianceItem | null>(null)
  const [adding, setAdding] = useState(false)

  const visible = useMemo(() => {
    const items = db.compliance.filter((c) => {
      if (propertyId && c.propertyId !== propertyId) return false
      if (lens === 'filed') return c.status !== 'scheduled'
      if (c.status !== 'scheduled') return false
      if (lens === 'overdue') return daysUntil(c.dueDate) < 0
      if (lens === 'violations') return c.kind === 'violation'
      return true
    })
    return sortCompliance(items)
  }, [db.compliance, lens, propertyId])

  const live = db.compliance.filter((c) => c.status === 'scheduled')
  const counts = {
    live: live.length,
    overdue: live.filter((c) => daysUntil(c.dueDate) < 0).length,
    violations: live.filter((c) => c.kind === 'violation').length,
    filed: db.compliance.filter((c) => c.status !== 'scheduled').length,
  }

  const LENSES: { key: Lens; label: string }[] = [
    { key: 'live', label: 'Scheduled' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'violations', label: 'Violations' },
    { key: 'filed', label: 'Closed' },
  ]

  return (
    <div className="page">
      <div className="banner info" style={{ marginBottom: 16 }}>
        <span className="b-icon">ℹ️</span>
        <div>
          The built-in filing windows are a <strong>starting point, not legal authority</strong>.
          LL11, LL152 and LL87 run on staggered per-building cycles, and rules change.
          Confirm every date against HPD, DOB, FDNY or DEP before you rely on it.
        </div>
      </div>

      <div className="stack" style={{ marginBottom: 16 }}>
        <div className="chip-row">
          {LENSES.map((l) => (
            <button key={l.key} className={`chip ${lens === l.key ? 'on' : ''}`} onClick={() => setLens(l.key)}>
              {l.label} <span className="tabular" style={{ opacity: .65 }}>{counts[l.key]}</span>
            </button>
          ))}
        </div>
        <select className="select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}
          aria-label="Filter by building" style={{ maxWidth: 260 }}>
          <option value="">All buildings</option>
          {db.properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      </div>

      <SectionHead title={LENSES.find((l) => l.key === lens)!.label} count={visible.length}>
        <button className="btn accent sm" disabled={db.properties.length === 0}
          onClick={() => setAdding(true)}>＋ Add filing</button>
      </SectionHead>

      {db.properties.length === 0 ? (
        <Empty icon="🏢" title="Add a building first"
          body="Filings and violations attach to a specific building." />
      ) : visible.length === 0 ? (
        <Empty icon="📋" title="Nothing here"
          body={lens === 'overdue'
            ? 'Nothing overdue. Worth keeping it that way.'
            : 'No items match this view.'}
          action={<button className="btn" onClick={() => setAdding(true)}>Add a filing</button>} />
      ) : (
        visible.map((c) => <ComplianceRow key={c.id} db={db} item={c} onOpen={setEditing} />)
      )}

      {editing && <ComplianceEditor db={db} item={editing} propertyId={editing.propertyId}
        onClose={() => setEditing(null)} />}
      {adding && <ComplianceEditor db={db} propertyId={propertyId || db.properties[0].id}
        onClose={() => setAdding(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function ComplianceEditor({ db, item, propertyId, onClose }: {
  db: Database
  item?: ComplianceItem
  propertyId: string
  onClose: () => void
}) {
  const [draft, setDraft] = useState<ComplianceItem>(item ?? newCompliance(propertyId))
  const [showPresets, setShowPresets] = useState(!item)
  const exists = !!item && db.compliance.some((c) => c.id === item.id)
  const set = <K extends keyof ComplianceItem>(k: K, v: ComplianceItem[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  /** Next occurrence of a month/day window, rolled forward if already past. */
  function nextWindow(month: number, day: number): string {
    const now = new Date()
    let d = new Date(now.getFullYear(), month - 1, day)
    if (toISO(d) < todayISO()) d = new Date(now.getFullYear() + 1, month - 1, day)
    return toISO(d)
  }

  function applyPreset(title: string) {
    const p = COMPLIANCE_PRESETS.find((x) => x.title === title)
    if (!p) return
    setDraft((d) => ({
      ...d,
      title: p.title,
      agency: p.agency,
      recurrence: p.recurrence,
      kind: 'filing',
      dueDate: p.window ? nextWindow(p.window.month, p.window.day) : addYears(todayISO(), 1),
      notes: `${p.note}\n\nApplies to: ${p.appliesTo}\n\n⚠️ Confirm this date with the agency — cycles vary by building.`,
    }))
    setShowPresets(false)
  }

  return (
    <Modal
      title={exists ? 'Filing' : 'Add filing or violation'}
      onClose={onClose}
      footer={
        <>
          {exists && <ConfirmButton label="Delete"
            onConfirm={() => { deleteCompliance(draft.id); onClose() }} />}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!draft.title.trim() || !draft.dueDate}
            onClick={() => { saveCompliance(draft); onClose() }}>Save</button>
        </>
      }
    >
      <div className="stack">
        {showPresets && (
          <div>
            <div className="eyebrow" style={{ marginBottom: 7 }}>Common NYC filings</div>
            <div className="stack tight" style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 8 }}>
              {COMPLIANCE_PRESETS.map((p) => (
                <button key={p.title} className="rowcard" onClick={() => applyPreset(p.title)}>
                  <span className="rowcard-body">
                    <span className="rowcard-title" style={{ fontSize: 14 }}>{p.title}</span>
                    <span className="rowcard-meta">
                      <Badge tone="blue">{AGENCY[p.agency]}</Badge>
                      <span>{RECURRENCE[p.recurrence]}</span>
                      <span className="truncate">· {p.appliesTo}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <button className="btn block" onClick={() => setShowPresets(false)}>
              Or enter one manually
            </button>
          </div>
        )}

        {!showPresets && (
          <>
            <Field label="What's due">
              <TextInput autoFocus value={draft.title}
                placeholder="HPD Class B — hallway lighting, 4th fl"
                onChange={(e) => set('title', e.target.value)} />
            </Field>

            <div className="form-grid two">
              <Field label="Building">
                <Select value={draft.propertyId}
                  onChange={(e) => set('propertyId', e.target.value)}
                  options={db.properties.map((p) => ({ value: p.id, label: p.address }))} />
              </Field>
              <Field label="Type">
                <Select value={draft.kind}
                  onChange={(e) => set('kind', e.target.value as ComplianceItem['kind'])}
                  options={[
                    { value: 'filing', label: 'Recurring filing' },
                    { value: 'violation', label: 'Violation / cure clock' },
                  ]} />
              </Field>
              <Field label="Agency">
                <Select value={draft.agency} options={opts(AGENCY)}
                  onChange={(e) => set('agency', e.target.value as ComplianceItem['agency'])} />
              </Field>
              <Field label="Repeats">
                <Select value={draft.recurrence} options={opts(RECURRENCE)}
                  onChange={(e) => set('recurrence', e.target.value as ComplianceItem['recurrence'])} />
              </Field>
              <Field label="Due date">
                <TextInput type="date" value={draft.dueDate}
                  onChange={(e) => set('dueDate', e.target.value)} />
              </Field>
              <Field label="Reference #" hint="Violation number, cycle, permit.">
                <TextInput value={draft.reference} onChange={(e) => set('reference', e.target.value)} />
              </Field>
            </div>

            <Field label="Notes">
              <TextArea value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>

            {draft.lastCompleted && (
              <p className="small muted">Last filed {formatDate(draft.lastCompleted)}.</p>
            )}

            {exists && draft.status === 'scheduled' && (
              <button className="btn accent block" onClick={() => { markComplianceFiled(draft.id); onClose() }}>
                {draft.recurrence === 'once'
                  ? 'Mark corrected / filed'
                  : `Mark filed — rolls forward to ${formatDate(addYears(draft.dueDate,
                      { annual: 1, biennial: 2, triennial: 3, quadrennial: 4,
                        quinquennial: 5, decennial: 10, once: 0 }[draft.recurrence]))}`}
              </button>
            )}
            {exists && draft.status !== 'scheduled' && (
              <button className="btn block" onClick={() => { set('status', 'scheduled') }}>
                Reopen
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}
