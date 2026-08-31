import type { ComplianceItem, Database, Task } from '../types'
import { locationLabel } from '../selectors'
import { urgency } from '../selectors'
import { daysUntil, relativeDays } from '../lib/dates'
import { AGENCY, CATEGORY_ICON, TASK_STATUS } from '../labels'
import { Badge } from './ui'

function dueTone(iso: string) {
  const u = urgency(iso)
  if (u === 'overdue') return 'red' as const
  if (u === 'today') return 'orange' as const
  if (u === 'soon') return 'amber' as const
  return 'grey' as const
}

export function TaskRow({ db, task, onOpen, showLocation = true }: {
  db: Database; task: Task; onOpen: (t: Task) => void; showLocation?: boolean
}) {
  const u = task.dueDate ? urgency(task.dueDate) : 'later'
  const where = locationLabel(db, task.propertyId, task.unitId)

  return (
    <button className={`rowcard rail ${u}`} onClick={() => onOpen(task)}>
      <span className={`pri-dot pri-${task.priority}`} aria-hidden />
      <span className="rowcard-body">
        <span className="rowcard-title" style={task.status === 'done'
          ? { textDecoration: 'line-through', opacity: .55 } : undefined}>
          {task.title || 'Untitled task'}
        </span>
        <span className="rowcard-meta">
          <span>{CATEGORY_ICON[task.category]}</span>
          {showLocation && <span className="truncate">{where}</span>}
          {task.assignee && <span>· {task.assignee}</span>}
          {task.thread.length > 0 && <span>· 💬 {task.thread.length}</span>}
          {task.photoIds.length > 0 && <span>· 📷 {task.photoIds.length}</span>}
        </span>
      </span>
      <span className="rowcard-side">
        {task.dueDate && (
          <Badge tone={dueTone(task.dueDate)}>{relativeDays(daysUntil(task.dueDate))}</Badge>
        )}
        {task.status !== 'open' && (
          <span className="tiny muted">{TASK_STATUS[task.status]}</span>
        )}
      </span>
    </button>
  )
}

export function ComplianceRow({ db, item, onOpen }: {
  db: Database; item: ComplianceItem; onOpen: (c: ComplianceItem) => void
}) {
  const u = urgency(item.dueDate)
  const prop = db.properties.find((p) => p.id === item.propertyId)

  return (
    <button className={`rowcard rail ${u}`} onClick={() => onOpen(item)}>
      <span className="rowcard-body">
        <span className="rowcard-title">
          {item.kind === 'violation' && <span style={{ marginRight: 6 }}>⚠️</span>}
          {item.title}
        </span>
        <span className="rowcard-meta">
          <Badge tone="blue">{AGENCY[item.agency]}</Badge>
          <span className="truncate">{prop?.address ?? 'Unknown property'}</span>
          {item.reference && <span className="truncate">· {item.reference}</span>}
        </span>
      </span>
      <span className="rowcard-side">
        <Badge tone={dueTone(item.dueDate)}>{relativeDays(daysUntil(item.dueDate))}</Badge>
        {item.status !== 'scheduled' && <span className="tiny muted">{item.status}</span>}
      </span>
    </button>
  )
}
