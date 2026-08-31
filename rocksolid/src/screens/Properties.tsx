import { useState } from 'react'
import type { Database, Property } from '../types'
import { newProperty, saveProperty } from '../actions'
import { unitsFor } from '../selectors'
import { daysUntil } from '../lib/dates'
import { opts, PROPERTY_TYPE } from '../labels'
import { navigate } from '../router'
import { Badge, Empty, Field, Modal, SectionHead, Select, TextArea, TextInput } from '../components/ui'

export function Properties({ db }: { db: Database }) {
  const [editing, setEditing] = useState<Property | null>(null)

  return (
    <div className="page">
      <SectionHead title="Portfolio" count={db.properties.length}>
        <button className="btn accent sm" onClick={() => setEditing(newProperty())}>＋ Add building</button>
      </SectionHead>

      {db.properties.length === 0 ? (
        <Empty
          icon="🏢" title="No buildings yet"
          body="Add the buildings you manage. Everything else — tasks, filings, walkthroughs, arrears — hangs off them."
          action={<button className="btn accent" onClick={() => setEditing(newProperty())}>Add your first building</button>}
        />
      ) : (
        <div className="grid two">
          {db.properties.map((p) => {
            const units = unitsFor(db, p.id)
            const openTasks = db.tasks.filter((t) => t.propertyId === p.id && t.status !== 'done')
            const overdue = openTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0).length
            const filings = db.compliance.filter((c) => c.propertyId === p.id && c.status === 'scheduled')
            const nextFiling = [...filings].sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))[0]
            const vacant = units.filter((u) => u.status !== 'occupied').length
            const owed = db.arrears.filter((a) => a.propertyId === p.id).reduce((s, a) => s + a.balance, 0)

            return (
              <button key={p.id} className="card card-pad" style={{ textAlign: 'left' }}
                onClick={() => navigate(`/properties/${p.id}`)}>
                <div className="row" style={{ alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="display" style={{ fontSize: 17 }}>{p.name || 'Untitled building'}</div>
                    <div className="small muted truncate">{p.address}</div>
                  </div>
                  <span className="spacer" />
                  {overdue > 0 && <Badge tone="red">{overdue} overdue</Badge>}
                </div>

                <div className="row wrapping" style={{ marginTop: 10, gap: 6 }}>
                  <Badge>{PROPERTY_TYPE[p.type]}</Badge>
                  {p.submarket && <Badge>{p.submarket}</Badge>}
                  <Badge>{units.length || p.unitCount} units</Badge>
                  {vacant > 0 && <Badge tone="amber">{vacant} not occupied</Badge>}
                  {owed > 0 && <Badge tone="red">${owed.toLocaleString()} owed</Badge>}
                </div>

                <div className="row small muted" style={{ marginTop: 11, gap: 14, flexWrap: 'wrap' }}>
                  <span>{openTasks.length} open task{openTasks.length === 1 ? '' : 's'}</span>
                  {nextFiling && (
                    <span>
                      Next filing: {nextFiling.title.length > 26
                        ? nextFiling.title.slice(0, 26) + '…' : nextFiling.title}
                    </span>
                  )}
                  {p.superName && <span>Super: {p.superName}</span>}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {editing && (
        <PropertyEditor property={editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}

export function PropertyEditor({ property, onClose }: { property: Property; onClose: () => void }) {
  const [draft, setDraft] = useState(property)
  const set = <K extends keyof Property>(k: K, v: Property[K]) => setDraft((d) => ({ ...d, [k]: v }))

  return (
    <Modal
      title={property.name ? 'Edit building' : 'Add building'}
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!draft.name.trim()}
            onClick={() => { saveProperty(draft); onClose() }}>Save</button>
        </>
      }
    >
      <div className="stack">
        <div className="form-grid two">
          <Field label="Building name">
            <TextInput autoFocus value={draft.name} placeholder="The Chandler"
              onChange={(e) => set('name', e.target.value)} />
          </Field>
          <Field label="Address">
            <TextInput value={draft.address} placeholder="303 W 116th St"
              onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label="Submarket">
            <TextInput value={draft.submarket} placeholder="South Harlem"
              onChange={(e) => set('submarket', e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={draft.type} options={opts(PROPERTY_TYPE)}
              onChange={(e) => set('type', e.target.value as Property['type'])} />
          </Field>
          <Field label="Unit count">
            <TextInput type="number" min={0} value={draft.unitCount || ''}
              onChange={(e) => set('unitCount', Number(e.target.value) || 0)} />
          </Field>
          <Field label="HPD registration #">
            <TextInput value={draft.hpdRegistration}
              onChange={(e) => set('hpdRegistration', e.target.value)} />
          </Field>
          <Field label="Superintendent">
            <TextInput value={draft.superName} onChange={(e) => set('superName', e.target.value)} />
          </Field>
          <Field label="Super's phone">
            <TextInput type="tel" value={draft.superPhone}
              onChange={(e) => set('superPhone', e.target.value)} />
          </Field>
          <Field label="Block / Lot" hint="Drives the LL87 and FISP cycles.">
            <TextInput value={draft.blockLot} placeholder="1826 / 45"
              onChange={(e) => set('blockLot', e.target.value)} />
          </Field>
        </div>
        <Field label="Notes">
          <TextArea value={draft.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder="Systems, quirks, history — anything you'd want on your first day back from vacation." />
        </Field>
      </div>
    </Modal>
  )
}
