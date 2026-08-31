import { useMemo, useState } from 'react'
import type { Database, Inspection } from '../types'
import { deleteInspection, reopenInspection } from '../actions'
import { checkedCount } from '../selectors'
import { formatDate, formatStamp } from '../lib/dates'
import { outcomeMessage, sendAsText } from '../lib/share'
import { navigate } from '../router'
import { Badge, ConfirmButton, Empty, PhotoStrip, SectionHead } from '../components/ui'
import { VisitTimeline } from '../components/VisitTimeline'

/** Everything already walked and filed, newest first, across every building. */
export function History({ db }: { db: Database }) {
  const [buildingId, setBuildingId] = useState('')
  const [flash, setFlash] = useState('')
  const [timeline, setTimeline] = useState<{ buildingId: string; label: string } | null>(null)

  const filed = useMemo(() => db.inspections
    .filter((i) => i.filedAt && (!buildingId || i.buildingId === buildingId))
    .sort((a, b) => b.visitDate.localeCompare(a.visitDate)),
  [db.inspections, buildingId])

  async function text(i: Inspection) {
    const lines = [
      `${db.buildings.find((b) => b.id === i.buildingId)?.address ?? ''} — ${formatDate(i.visitDate)}`,
      '',
      ...i.items.map((c) =>
        `${c.status === 'problem' ? '✗' : c.status === 'ok' ? '✓' : '–'} ${c.label}${c.note ? ` — ${c.note}` : ''}`),
    ]
    if (i.note.trim()) lines.push('', i.note.trim())
    setFlash(outcomeMessage(await sendAsText(lines.join('\n'))))
    setTimeout(() => setFlash(''), 2600)
  }

  return (
    <div className="page">
      {db.buildings.length > 1 && (
        <select className="select" style={{ maxWidth: 280, marginBottom: 16 }}
          value={buildingId} onChange={(e) => setBuildingId(e.target.value)}
          aria-label="Filter by building">
          <option value="">All buildings</option>
          {db.buildings.map((b) => <option key={b.id} value={b.id}>{b.address}</option>)}
        </select>
      )}

      <SectionHead title="Saved visits" count={filed.length}>
        {flash && <span className="tiny" style={{ color: 'var(--ok)' }}>{flash}</span>}
      </SectionHead>

      {filed.length === 0 ? (
        <Empty icon="🗓" title="Nothing saved yet"
          body="Open a building, walk the checklist, photograph what's wrong, then press Save to history. Every visit you file lands here so you can hold this week against last week."
          action={<button className="btn accent" onClick={() => navigate('/buildings')}>Go to buildings</button>} />
      ) : filed.map((i) => (
        <VisitCard key={i.id} db={db} inspection={i}
          showBuilding={!buildingId}
          onText={() => text(i)}
          onTimeline={(label) => setTimeline({ buildingId: i.buildingId, label })} />
      ))}

      {timeline && (
        <VisitTimeline db={db} buildingId={timeline.buildingId} label={timeline.label}
          onClose={() => setTimeline(null)} />
      )}
    </div>
  )
}

function VisitCard({ db, inspection, showBuilding, onText, onTimeline }: {
  db: Database
  inspection: Inspection
  showBuilding: boolean
  onText: () => void
  onTimeline: (label: string) => void
}) {
  const [open, setOpen] = useState(false)
  const address = db.buildings.find((b) => b.id === inspection.buildingId)?.address ?? 'Unknown building'
  const problems = inspection.items.filter((c) => c.status === 'problem')
  const shots = inspection.items.flatMap((c) => c.photoIds).concat(inspection.photoIds)

  return (
    <div className="note" style={{ marginBottom: 9 }}>
      <button className="row" style={{ width: '100%', background: 'none', textAlign: 'left' }}
        onClick={() => setOpen(!open)}>
        <span style={{ minWidth: 0 }}>
          {showBuilding && <span className="display" style={{ fontSize: 15 }}>{address}<br /></span>}
          <span style={{ fontWeight: showBuilding ? 400 : 600 }}>
            {formatDate(inspection.visitDate)}
          </span>
          <span className="rowcard-meta" style={{ marginTop: 3 }}>
            {inspection.items.length > 0 && (
              <span>{checkedCount(inspection)}/{inspection.items.length} checked</span>
            )}
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
                <span style={{
                  color: c.status === 'problem' ? 'var(--danger)'
                    : c.status === 'ok' ? 'var(--ok)' : 'var(--muted)',
                }}>
                  {c.status === 'problem' ? '✗' : c.status === 'ok' ? '✓' : '–'}
                </span>
                <span className="small">{c.label}</span>
                <span className="spacer" />
                <button className="btn ghost sm" onClick={() => onTimeline(c.label)}>Past</button>
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

          {inspection.filedAt && inspection.filedAt.slice(0, 10) !== inspection.visitDate && (
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Walked {formatDate(inspection.visitDate)}, written up {formatStamp(inspection.filedAt)}.
            </p>
          )}

          <div className="row" style={{ marginTop: 12, gap: 7 }}>
            <button className="btn ghost sm" onClick={onText}>Text</button>
            <button className="btn ghost sm"
              onClick={() => navigate(`/buildings/${inspection.buildingId}`)}>Building</button>
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
