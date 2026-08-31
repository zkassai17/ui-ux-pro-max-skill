import { useMemo, useState } from 'react'
import type { ArrearsEntry, Database } from '../types'
import { deleteArrears, newArrears, upsertArrears } from '../actions'
import { money, unitsFor } from '../selectors'
import { daysUntil, formatDate } from '../lib/dates'
import { NOTICE_STAGE, NOTICE_TONE, opts } from '../labels'
import {
  Badge, ConfirmButton, Empty, Field, Modal, SectionHead, Select, TextArea, TextInput,
} from '../components/ui'

export function Arrears({ db }: { db: Database }) {
  const [editing, setEditing] = useState<ArrearsEntry | null>(null)
  const [adding, setAdding] = useState(false)

  const rows = useMemo(() => {
    return [...db.arrears]
      .map((a) => ({
        entry: a,
        unit: db.units.find((u) => u.id === a.unitId),
        property: db.properties.find((p) => p.id === a.propertyId),
      }))
      .sort((x, y) => y.entry.balance - x.entry.balance)
  }, [db.arrears, db.units, db.properties])

  const total = db.arrears.reduce((s, a) => s + a.balance, 0)
  const monthlyRoll = db.units
    .filter((u) => db.arrears.some((a) => a.unitId === u.id))
    .reduce((s, u) => s + u.rent, 0)
  const escalated = db.arrears.filter((a) => a.noticeStage === 'demand' || a.noticeStage === 'legal').length

  return (
    <div className="page">
      <div className="stats" style={{ marginBottom: 18 }}>
        <div className={`stat ${total > 0 ? 'alert' : ''}`}>
          <div className="label">Total owed</div>
          <div className="value">{money(total)}</div>
          <div className="sub">{db.arrears.length} units</div>
        </div>
        <div className="stat">
          <div className="label">Monthly rent at risk</div>
          <div className="value">{money(monthlyRoll)}</div>
          <div className="sub">combined for those units</div>
        </div>
        <div className={`stat ${escalated > 0 ? 'warn' : ''}`}>
          <div className="label">Escalated</div>
          <div className="value">{escalated}</div>
          <div className="sub">demand or with counsel</div>
        </div>
        <div className="stat">
          <div className="label">Avg balance</div>
          <div className="value">{money(db.arrears.length ? total / db.arrears.length : 0)}</div>
          <div className="sub">per unit behind</div>
        </div>
      </div>

      <SectionHead title="Units behind" count={db.arrears.length}>
        <button className="btn accent sm" disabled={db.units.length === 0}
          onClick={() => setAdding(true)}>＋ Add unit</button>
      </SectionHead>

      {db.units.length === 0 ? (
        <Empty icon="🚪" title="No units yet"
          body="Add buildings and units first — arrears are tracked per unit." />
      ) : rows.length === 0 ? (
        <Empty icon="✓" title="Nobody's behind"
          body="Nothing outstanding right now. Add a unit here the moment one falls behind so the notice dates are on the record."
          action={<button className="btn" onClick={() => setAdding(true)}>Add a unit</button>} />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th className="num">Balance</th>
                <th className="num">Months</th>
                <th>Last payment</th>
                <th>Notice stage</th>
                <th>Plan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ entry, unit, property }) => {
                const months = unit && unit.rent > 0 ? entry.balance / unit.rent : 0
                const since = entry.lastPaymentDate ? Math.abs(daysUntil(entry.lastPaymentDate)) : null
                return (
                  <tr key={entry.id} style={{ cursor: 'pointer' }} onClick={() => setEditing(entry)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{property?.name ?? '—'} · {unit?.label ?? '—'}</div>
                      <div className="tiny muted">{unit?.tenantName || 'No tenant on file'}</div>
                    </td>
                    <td className="num" style={{ fontWeight: 600, color: 'var(--danger)' }}>
                      {money(entry.balance)}
                    </td>
                    <td className="num">{months ? months.toFixed(1) : '—'}</td>
                    <td>
                      {entry.lastPaymentDate ? (
                        <>
                          <div>{formatDate(entry.lastPaymentDate)}</div>
                          <div className="tiny muted">{since} days ago · {money(entry.lastPaymentAmount)}</div>
                        </>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td><Badge tone={NOTICE_TONE[entry.noticeStage]}>{NOTICE_STAGE[entry.noticeStage]}</Badge></td>
                    <td className="small muted" style={{ maxWidth: 200 }}>
                      {entry.paymentPlan || '—'}
                    </td>
                    <td><span className="muted">›</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="tiny muted" style={{ marginTop: 12 }}>
        Manual figures for your own tracking — this is not the ledger of record. Reconcile against
        whatever the office actually bills from before you send anything.
      </p>

      {(editing || adding) && (
        <ArrearsEditor db={db} entry={editing} onClose={() => { setEditing(null); setAdding(false) }} />
      )}
    </div>
  )
}

function ArrearsEditor({ db, entry, onClose }: {
  db: Database; entry: ArrearsEntry | null; onClose: () => void
}) {
  const firstProperty = db.properties[0]?.id ?? ''
  const [propertyId, setPropertyId] = useState(entry?.propertyId ?? firstProperty)
  const [draft, setDraft] = useState<ArrearsEntry>(
    entry ?? newArrears(unitsFor(db, firstProperty)[0]?.id ?? '', firstProperty),
  )
  const set = <K extends keyof ArrearsEntry>(k: K, v: ArrearsEntry[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const units = unitsFor(db, propertyId)
  const exists = !!entry

  return (
    <Modal
      title={exists ? 'Arrears' : 'Add unit to arrears'}
      onClose={onClose}
      footer={
        <>
          {exists && <ConfirmButton label="Clear entry"
            onConfirm={() => { deleteArrears(draft.id); onClose() }} />}
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" disabled={!draft.unitId}
            onClick={() => { upsertArrears({ ...draft, propertyId }); onClose() }}>Save</button>
        </>
      }
    >
      <div className="stack">
        {!exists && (
          <div className="form-grid two">
            <Field label="Building">
              <select className="select" value={propertyId}
                onChange={(e) => {
                  setPropertyId(e.target.value)
                  set('unitId', unitsFor(db, e.target.value)[0]?.id ?? '')
                }}>
                {db.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Field label="Unit">
              <select className="select" value={draft.unitId}
                onChange={(e) => set('unitId', e.target.value)}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}{u.tenantName ? ` — ${u.tenantName}` : ''}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        <div className="form-grid two">
          <Field label="Balance owed">
            <TextInput type="number" min={0} step="0.01" autoFocus value={draft.balance || ''}
              onChange={(e) => set('balance', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Notice stage">
            <Select value={draft.noticeStage} options={opts(NOTICE_STAGE)}
              onChange={(e) => set('noticeStage', e.target.value as ArrearsEntry['noticeStage'])} />
          </Field>
          <Field label="Last payment amount">
            <TextInput type="number" min={0} step="0.01" value={draft.lastPaymentAmount || ''}
              onChange={(e) => set('lastPaymentAmount', Number(e.target.value) || 0)} />
          </Field>
          <Field label="Last payment date">
            <TextInput type="date" value={draft.lastPaymentDate}
              onChange={(e) => set('lastPaymentDate', e.target.value)} />
          </Field>
        </div>

        <Field label="Payment plan" hint="What was agreed, and when it was agreed.">
          <TextInput value={draft.paymentPlan}
            placeholder="Half monthly through October, agreed 8/14"
            onChange={(e) => set('paymentPlan', e.target.value)} />
        </Field>

        <Field label="Notes">
          <TextArea value={draft.notes} onChange={(e) => set('notes', e.target.value)}
            placeholder="Conversations, promises, hardship claims — dated." />
        </Field>
      </div>
    </Modal>
  )
}
