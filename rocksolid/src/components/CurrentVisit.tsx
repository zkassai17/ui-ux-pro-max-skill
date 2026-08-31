import { useEffect, useMemo, useState } from 'react'
import type { CheckItem, Database } from '../types'
import {
  addCheckItem, fileInspection, openInspection, removeCheckItem, saveInspection,
} from '../actions'
import { checkedCount, checkLabels, inspectionHistory, problemCount } from '../selectors'
import { navigate } from '../router'
import { Badge, PhotoStrip, TextArea, TextInput } from './ui'
import { VisitTimeline } from './VisitTimeline'

/**
 * The visit you're on right now: tick the areas, photograph what's wrong, file
 * it. Past visits deliberately don't live here — this screen is what you hold
 * in one hand while walking the building.
 */
export function CurrentVisit({ db, buildingId }: { db: Database; buildingId: string }) {
  const [adding, setAdding] = useState('')
  const [timelineFor, setTimelineFor] = useState<string | null>(null)
  const [justFiled, setJustFiled] = useState(false)

  useEffect(() => { openInspection(buildingId, db.inspections) }, [buildingId, db.inspections])

  const current = db.inspections.find((i) => i.buildingId === buildingId && !i.filedAt)
  const filedCount = inspectionHistory(db, buildingId).length
  const labels = useMemo(() => checkLabels(db, buildingId), [db, buildingId])

  function patch(item: CheckItem, next: Partial<CheckItem>) {
    if (!current) return
    saveInspection({
      ...current,
      items: current.items.map((c) => (c.id === item.id ? { ...c, ...next } : c)),
    })
  }

  if (!current) return null

  const problems = problemCount(current)
  const checked = checkedCount(current)
  const empty = checked === 0 && !current.note.trim() && current.photoIds.length === 0

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <span className="eyebrow">This visit</span>
        <span className="spacer" />
        <span className="tiny muted">{checked}/{current.items.length} checked</span>
        {problems > 0 && <Badge tone="red">{problems} problem{problems === 1 ? '' : 's'}</Badge>}
      </div>

      <div className="card card-pad">
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
              {labels.includes(c.label) && filedCount > 0 && (
                <button className="btn ghost sm" onClick={() => setTimelineFor(c.label)}>Past</button>
              )}
              <button className="iconbtn" onClick={() => removeCheckItem(current.id, c.id)}
                aria-label={`Remove ${c.label}`}>✕</button>
            </div>

            {c.status === 'problem' && (
              <div style={{ paddingLeft: 4, paddingTop: 8 }}>
                <TextArea value={c.note} placeholder="What's wrong?" style={{ minHeight: 48 }}
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
          <TextArea value={current.note} style={{ marginTop: 6 }}
            placeholder="Notes and photos that aren't about one area."
            onChange={(e) => saveInspection({ ...current, note: e.target.value })} />
          <div style={{ marginTop: 9 }}>
            <PhotoStrip ids={current.photoIds}
              onChange={(ids) => saveInspection({ ...current, photoIds: ids })} />
          </div>
        </div>
      </div>

      <button className="btn accent block" style={{ marginTop: 16 }} disabled={empty}
        onClick={() => { fileInspection(current.id); setJustFiled(true) }}>
        Save to history
      </button>

      {justFiled ? (
        <div className="banner accent" style={{ marginTop: 12 }}>
          <span className="b-icon">✓</span>
          <div>
            Saved. It's in <button className="linklike" onClick={() => navigate('/history')}>History</button>,
            and a fresh checklist is ready above.
          </div>
        </div>
      ) : (
        <p className="tiny muted" style={{ marginTop: 7, textAlign: 'center' }}>
          Files this visit with today's date and starts a fresh one.
          {filedCount > 0 && <> {filedCount} saved so far.</>}
        </p>
      )}

      {timelineFor && (
        <VisitTimeline db={db} buildingId={buildingId} label={timelineFor}
          onClose={() => setTimelineFor(null)} />
      )}
    </>
  )
}
