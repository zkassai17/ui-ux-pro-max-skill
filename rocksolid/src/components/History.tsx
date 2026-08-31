import { useEffect, useMemo, useState } from 'react'
import type { CheckItem, Database, Inspection } from '../types'
import {
  addCheckItem, deleteInspection, fileInspection, openInspection,
  removeCheckItem, reopenInspection, saveInspection,
} from '../actions'
import { checkedCount, checkLabels, inspectionHistory, itemTimeline, problemCount } from '../selectors'
import { formatDate, formatStamp } from '../lib/dates'
import { outcomeMessage, sendAsText } from '../lib/share'
import { Badge, ConfirmButton, Empty, Modal, PhotoStrip, TextArea, TextInput } from './ui'

/** Building history: this week's walk on top, every filed week beneath it. */
export function History({ db, buildingId }: { db: Database; buildingId: string }) {
  const [adding, setAdding] = useState('')
  const [timelineFor, setTimelineFor] = useState<string | null>(null)
  const [flash, setFlash] = useState('')

  // Make sure there's always an open walk to fill in.
  useEffect(() => { openInspection(buildingId, db.inspections) }, [buildingId, db.inspections])

  const current = db.inspections.find((i) => i.buildingId === buildingId && !i.filedAt)
  const history = inspectionHistory(db, buildingId)
  const labels = useMemo(() => checkLabels(db, buildingId), [db, buildingId])

  function patch(item: CheckItem, next: Partial<CheckItem>) {
    if (!current) return
    saveInspection({
      ...current,
      items: current.items.map((c) => (c.id === item.id ? { ...c, ...next } : c)),
    })
  }

  async function text(i: Inspection) {
    const lines = [
      `${db.buildings.find((b) => b.id === i.buildingId)?.address ?? ''} — ${formatDate((i.filedAt ?? i.startedAt).slice(0, 10))}`,
      '',
      ...i.items.map((c) =>
        `${c.status === 'problem' ? '✗' : c.status === 'ok' ? '✓' : '–'} ${c.label}${c.note ? ` — ${c.note}` : ''}`),
    ]
    if (i.note.trim()) lines.push('', i.note.trim())
    setFlash(outcomeMessage(await sendAsText(lines.join('\n'))))
    setTimeout(() => setFlash(''), 2600)
  }

  if (!current) return null

  const problems = problemCount(current)
  const checked = checkedCount(current)

  return (
    <>
      {/* ---------- this week's walk ---------- */}
      <div className="card card-pad" style={{ marginBottom: 22 }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <span className="eyebrow">This visit</span>
          <span className="spacer" />
          <span className="tiny muted">{checked}/{current.items.length} checked</span>
          {problems > 0 && <Badge tone="red">{problems} problem{problems === 1 ? '' : 's'}</Badge>}
        </div>

        {current.items.map((c) => (
          <div key={c.id} className="check-line">
            <div className="row" style={{ gap: 8 }}>
              <button className={`chk ${c.status === 'ok' ? 'on ok' : ''}`}
                onClick={() => patch(c, { status: c.status === 'ok' ? 'pending' : 'ok' })}
                aria-label={`${c.label} is fine`}>✓</button>
              <button className={`chk ${c.status === 'problem' ? 'on bad' : ''}`}
                onClick={() => patch(c, { status: c.status === 'problem' ? 'pending' : 'problem' })}
                aria-label={`${c.label} has a problem`}>✗</button>
              <span className="wt-label">{c.label}</span>
              {labels.includes(c.label) && history.length > 0 && (
                <button className="btn ghost sm" onClick={() => setTimelineFor(c.label)}>Past</button>
              )}
              <button className="iconbtn" onClick={() => removeCheckItem(current.id, c.id)}
                aria-label={`Remove ${c.label}`}>✕</button>
            </div>

            {c.status === 'problem' && (
              <div style={{ paddingLeft: 4, paddingTop: 8 }}>
                <TextArea value={c.note} placeholder="What's wrong?"
                  style={{ minHeight: 48 }}
                  onChange={(e) => patch(c, { note: e.target.value })} />
                <div style={{ marginTop: 8 }}>
                  <PhotoStrip ids={c.photoIds} onChange={(ids) => patch(c, { photoIds: ids })} />
                </div>
              </div>
            )}
          </div>
        ))}

        <div className="row" style={{ marginTop: 12, gap: 7 }}>
          <TextInput value={adding} placeholder="Add another area…"
            onChange={(e) => setAdding(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && adding.trim()) {
                e.preventDefault(); addCheckItem(current.id, adding.trim()); setAdding('')
              }
            }} />
          <button className="btn" disabled={!adding.trim()}
            onClick={() => { addCheckItem(current.id, adding.trim()); setAdding('') }}>Add</button>
        </div>

        <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
          <span className="eyebrow">Anything else</span>
          <TextArea value={current.note} placeholder="Notes and photos that aren't about one area."
            style={{ marginTop: 6 }}
            onChange={(e) => saveInspection({ ...current, note: e.target.value })} />
          <div style={{ marginTop: 9 }}>
            <PhotoStrip ids={current.photoIds}
              onChange={(ids) => saveInspection({ ...current, photoIds: ids })} />
          </div>
        </div>

        <button className="btn accent block" style={{ marginTop: 16 }}
          disabled={checked === 0 && !current.note.trim() && current.photoIds.length === 0}
          onClick={() => fileInspection(current.id)}>
          Save to history
        </button>
        <p className="tiny muted" style={{ marginTop: 7, textAlign: 'center' }}>
          Files this visit with today's date and starts a fresh one.
        </p>
      </div>

      {/* ---------- past visits ---------- */}
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="eyebrow">History</span>
        {flash && <><span className="spacer" /><span className="tiny" style={{ color: 'var(--ok)' }}>{flash}</span></>}
      </div>

      {history.length === 0 ? (
        <Empty icon="🗓" title="No past visits yet"
          body="Once you save this visit it lands here. Come back next week, shoot the same spots, and you'll have the two side by side." />
      ) : history.map((i) => (
        <PastVisit key={i.id} inspection={i} onText={() => text(i)} />
      ))}

      {timelineFor && (
        <TimelineModal db={db} buildingId={buildingId} label={timelineFor}
          onClose={() => setTimelineFor(null)} />
      )}
    </>
  )
}

function PastVisit({ inspection, onText }: {
  inspection: Inspection; onText: () => void
}) {
  const [open, setOpen] = useState(false)
  const problems = inspection.items.filter((c) => c.status === 'problem')
  const shots = inspection.items.flatMap((c) => c.photoIds).concat(inspection.photoIds)

  return (
    <div className="note" style={{ marginBottom: 9 }}>
      <button className="row" style={{ width: '100%', background: 'none', textAlign: 'left' }}
        onClick={() => setOpen(!open)}>
        <span>
          <span style={{ fontWeight: 600 }}>{formatDate((inspection.filedAt ?? '').slice(0, 10))}</span>
          <span className="rowcard-meta" style={{ marginTop: 3 }}>
            {inspection.items.length > 0 && <span>{checkedCount(inspection)}/{inspection.items.length} checked</span>}
            {shots.length > 0 && <span>· 📷 {shots.length}</span>}
          </span>
        </span>
        <span className="spacer" />
        {problems.length > 0
          ? <Badge tone="red">{problems.length} problem{problems.length === 1 ? '' : 's'}</Badge>
          : inspection.items.length > 0 ? <Badge tone="green">All clear</Badge> : null}
        <span className="muted" style={{ marginLeft: 8 }}>{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          {inspection.items.map((c) => (
            <div key={c.id} style={{ padding: '7px 0', borderTop: '1px solid var(--line-soft)' }}>
              <div className="row" style={{ gap: 7 }}>
                <span style={{ color: c.status === 'problem' ? 'var(--danger)' : c.status === 'ok' ? 'var(--ok)' : 'var(--muted)' }}>
                  {c.status === 'problem' ? '✗' : c.status === 'ok' ? '✓' : '–'}
                </span>
                <span className="small">{c.label}</span>
              </div>
              {c.note && <div className="small wrap muted" style={{ paddingLeft: 21 }}>{c.note}</div>}
              {c.photoIds.length > 0 && (
                <div style={{ paddingLeft: 21, marginTop: 6 }}><PhotoStrip ids={c.photoIds} /></div>
              )}
            </div>
          ))}
          {inspection.note && (
            <p className="small wrap" style={{ marginTop: 10, color: 'var(--ink-2)' }}>{inspection.note}</p>
          )}
          {inspection.photoIds.length > 0 && (
            <div style={{ marginTop: 9 }}><PhotoStrip ids={inspection.photoIds} /></div>
          )}
          <div className="row" style={{ marginTop: 12, gap: 7 }}>
            <button className="btn ghost sm" onClick={onText}>Text</button>
            <button className="btn ghost sm" onClick={() => reopenInspection(inspection.id)}>Reopen</button>
            <span className="spacer" />
            <ConfirmButton label="Delete" className="btn ghost sm"
              onConfirm={() => deleteInspection(inspection.id)} />
          </div>
        </div>
      )}
    </div>
  )
}

/** One area, every week it was walked — improving, or the same every time. */
function TimelineModal({ db, buildingId, label, onClose }: {
  db: Database; buildingId: string; label: string; onClose: () => void
}) {
  const rows = itemTimeline(db, buildingId, label)
  return (
    <Modal title={label} onClose={onClose}
      footer={<><span className="spacer" /><button className="btn primary" onClick={onClose}>Done</button></>}>
      {rows.length === 0 ? (
        <Empty icon="🗓" title="No history for this area yet"
          body="Save a visit and it starts building up here." />
      ) : (
        <div className="stack">
          <p className="small muted">Every visit where this was checked, newest first.</p>
          {rows.map(({ at, item }, n) => (
            <div key={`${at}-${n}`} className="note">
              <div className="row" style={{ marginBottom: 5 }}>
                <span className="eyebrow">{formatStamp(at)}</span>
                <span className="spacer" />
                {item.status === 'problem'
                  ? <Badge tone="red">Problem</Badge>
                  : item.status === 'ok' ? <Badge tone="green">OK</Badge> : <Badge>Not checked</Badge>}
              </div>
              {item.note && <div className="small wrap">{item.note}</div>}
              {item.photoIds.length > 0 && (
                <div style={{ marginTop: 7 }}><PhotoStrip ids={item.photoIds} /></div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
