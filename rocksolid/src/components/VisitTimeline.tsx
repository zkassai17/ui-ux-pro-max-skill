import type { Database } from '../types'
import { itemTimeline } from '../selectors'
import { formatStamp } from '../lib/dates'
import { Badge, Empty, Modal, PhotoStrip } from './ui'

/** One area, every visit it was checked — improving, or the same every week. */
export function VisitTimeline({ db, buildingId, label, onClose }: {
  db: Database; buildingId: string; label: string; onClose: () => void
}) {
  const rows = itemTimeline(db, buildingId, label)

  return (
    <Modal title={label} onClose={onClose}
      footer={<><span className="spacer" />
        <button className="btn primary" onClick={onClose}>Done</button></>}>
      {rows.length === 0 ? (
        <Empty icon="🗓" title="Nothing saved for this area yet"
          body="Save a visit and it starts building up here." />
      ) : (
        <div className="stack">
          <p className="small muted">Every visit where this was checked, newest first.</p>
          {rows.map(({ at, item }, n) => (
            <div key={`${at}-${n}`} className="note">
              <div className="row" style={{ marginBottom: 5 }}>
                <span className="eyebrow">{formatStamp(at)}</span>
                <span className="spacer" />
                {item.status === 'problem' ? <Badge tone="red">Problem</Badge>
                  : item.status === 'ok' ? <Badge tone="green">OK</Badge>
                  : <Badge>Not checked</Badge>}
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
