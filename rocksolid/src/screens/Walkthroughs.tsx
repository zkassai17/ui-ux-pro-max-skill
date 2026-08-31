import { useState } from 'react'
import type { Database, ResultStatus, Walkthrough } from '../types'
import { deleteWalkthrough, newTask, saveTask, saveWalkthrough, startWalkthrough } from '../actions'
import { formatDate, todayISO } from '../lib/dates'
import { navigate } from '../router'
import {
  Badge, ConfirmButton, Empty, Field, Modal, PhotoStrip, SectionHead, TextArea,
} from '../components/ui'

export function Walkthroughs({ db }: { db: Database }) {
  const [starting, setStarting] = useState(false)

  return (
    <div className="page">
      <SectionHead title="Walkthroughs" count={db.walkthroughs.length}>
        <button className="btn accent sm" disabled={db.properties.length === 0}
          onClick={() => setStarting(true)}>＋ Start walkthrough</button>
      </SectionHead>

      {db.properties.length === 0 ? (
        <Empty icon="🏢" title="Add a building first"
          body="Walkthroughs are recorded against a specific building."
          action={<button className="btn" onClick={() => navigate('/properties')}>Go to portfolio</button>} />
      ) : db.walkthroughs.length === 0 ? (
        <Empty icon="🔦" title="No walkthroughs yet"
          body="Run through a building with the checklist open. Anything you mark as an issue can become a task in one tap, and the dated record stays here."
          action={<button className="btn accent" onClick={() => setStarting(true)}>Start one now</button>} />
      ) : (
        db.walkthroughs.map((w) => {
          const p = db.properties.find((x) => x.id === w.propertyId)
          const checked = w.results.filter((r) => r.status !== 'pending').length
          const issues = w.results.filter((r) => r.status === 'issue').length
          return (
            <button key={w.id} className="rowcard" onClick={() => navigate(`/walkthroughs/${w.id}`)}>
              <span className="rowcard-body">
                <span className="rowcard-title">{p?.name ?? 'Unknown building'} — {w.templateName}</span>
                <span className="rowcard-meta">
                  <span>{formatDate(w.date)}</span>
                  <span>· {checked}/{w.results.length} checked</span>
                  {issues > 0 && <Badge tone="red">{issues} issue{issues === 1 ? '' : 's'}</Badge>}
                </span>
              </span>
              <span className="rowcard-side">
                {w.completedAt ? <Badge tone="green">Complete</Badge> : <Badge tone="amber">In progress</Badge>}
              </span>
            </button>
          )
        })
      )}

      <div className="section" style={{ marginTop: 32 }}>
        <SectionHead title="Checklist templates" count={db.templates.length} />
        <p className="small muted" style={{ marginBottom: 10 }}>
          These ship pre-built for NYC walk-ups and mixed-use stock. Editing templates is on the list; for now
          add anything extra as a note on the walkthrough itself.
        </p>
        {db.templates.map((t) => (
          <div className="rowcard" key={t.id}>
            <span className="rowcard-body">
              <span className="rowcard-title">{t.name}</span>
              <span className="rowcard-meta">
                <span>{t.sections.length} sections</span>
                <span>· {t.sections.reduce((n, s) => n + s.items.length, 0)} checks</span>
              </span>
            </span>
          </div>
        ))}
      </div>

      {starting && <StartModal db={db} onClose={() => setStarting(false)} />}
    </div>
  )
}

function StartModal({ db, onClose }: { db: Database; onClose: () => void }) {
  const [propertyId, setPropertyId] = useState(db.properties[0]?.id ?? '')
  const [templateId, setTemplateId] = useState(db.templates[0]?.id ?? '')

  function go() {
    const tpl = db.templates.find((t) => t.id === templateId)
    if (!tpl || !propertyId) return
    const w = startWalkthrough(propertyId, tpl)
    onClose()
    navigate(`/walkthroughs/${w.id}`)
  }

  return (
    <Modal title="Start a walkthrough" onClose={onClose}
      footer={<><span className="spacer" />
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn accent" onClick={go}>Start</button></>}>
      <div className="stack">
        <Field label="Building">
          <select className="select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            {db.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Checklist">
          <select className="select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {db.templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------

export function WalkthroughRun({ db, id }: { db: Database; id: string }) {
  const [noteFor, setNoteFor] = useState<string | null>(null)

  const w = db.walkthroughs.find((x) => x.id === id)
  const tpl = w ? db.templates.find((t) => t.id === w.templateId) : undefined
  const property = w ? db.properties.find((p) => p.id === w.propertyId) : undefined

  if (!w || !tpl) {
    return (
      <div className="page">
        <Empty icon="🔦" title="Walkthrough not found"
          body="It may have been deleted, or its checklist template was removed."
          action={<button className="btn" onClick={() => navigate('/walkthroughs')}>Back</button>} />
      </div>
    )
  }

  const labelFor = (itemId: string) =>
    tpl.sections.flatMap((s) => s.items).find((i) => i.id === itemId)?.label ?? itemId

  function update(itemId: string, patch: Partial<Walkthrough['results'][number]>) {
    const next: Walkthrough = {
      ...w!,
      results: w!.results.map((r) => (r.itemId === itemId ? { ...r, ...patch } : r)),
    }
    saveWalkthrough(next)
  }

  function makeTask(itemId: string) {
    const r = w!.results.find((x) => x.itemId === itemId)
    saveTask(newTask({
      title: labelFor(itemId),
      propertyId: w!.propertyId,
      category: 'repair',
      priority: 'high',
      dueDate: todayISO(),
      detail: [`Raised on the ${formatDate(w!.date)} ${w!.templateName}.`, r?.note].filter(Boolean).join('\n\n'),
      photoIds: r?.photoIds ?? [],
    }))
    navigate('/tasks')
  }

  const checked = w.results.filter((r) => r.status !== 'pending').length
  const issues = w.results.filter((r) => r.status === 'issue')
  const pct = Math.round((checked / Math.max(1, w.results.length)) * 100)
  const active = noteFor ? w.results.find((r) => r.itemId === noteFor) : null

  return (
    <div className="page">
      <button className="btn ghost sm" style={{ marginBottom: 10 }}
        onClick={() => navigate('/walkthroughs')}>← Walkthroughs</button>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row wrapping" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 className="display" style={{ fontSize: 20 }}>{property?.name ?? 'Unknown building'}</h2>
            <div className="small muted">{w.templateName} · {formatDate(w.date)}</div>
          </div>
          <span className="spacer" />
          {w.completedAt
            ? <Badge tone="green">Complete</Badge>
            : <Badge tone="amber">In progress</Badge>}
        </div>
        <div className="progress" style={{ marginTop: 12 }}>
          <div style={{ width: `${pct}%` }} />
        </div>
        <div className="row small muted" style={{ marginTop: 7, gap: 12 }}>
          <span>{checked} of {w.results.length} checked</span>
          {issues.length > 0 && <span style={{ color: 'var(--danger)' }}>{issues.length} issue{issues.length === 1 ? '' : 's'}</span>}
        </div>
      </div>

      {tpl.sections.map((section) => (
        <div className="card card-pad wt-section" key={section.id}>
          <h4>{section.name}</h4>
          {section.items.map((item) => {
            const r = w.results.find((x) => x.itemId === item.id)
            const status = r?.status ?? 'pending'
            return (
              <div key={item.id}>
                <div className="wt-item">
                  <span className="wt-label">{item.label}</span>
                  <span className="wt-buttons">
                    {(['ok', 'issue', 'na'] as ResultStatus[]).map((s) => (
                      <button key={s}
                        className={`wt-btn ${s} ${status === s ? 'on' : ''}`}
                        onClick={() => update(item.id, { status: status === s ? 'pending' : s })}
                        aria-label={s === 'ok' ? 'OK' : s === 'issue' ? 'Issue' : 'Not applicable'}>
                        {s === 'ok' ? '✓' : s === 'issue' ? '!' : '–'}
                      </button>
                    ))}
                    <button className="wt-btn" onClick={() => setNoteFor(item.id)} aria-label="Add note or photo">
                      {(r?.note || r?.photoIds.length) ? '📝' : '＋'}
                    </button>
                  </span>
                </div>
                {(r?.note || (r?.photoIds.length ?? 0) > 0) && (
                  <div style={{ padding: '0 4px 10px 4px' }}>
                    {r?.note && <div className="small wrap" style={{ color: 'var(--ink-2)' }}>{r.note}</div>}
                    {(r?.photoIds.length ?? 0) > 0 && (
                      <div style={{ marginTop: 6 }}><PhotoStrip ids={r!.photoIds} /></div>
                    )}
                    {status === 'issue' && (
                      <button className="btn sm" style={{ marginTop: 7 }} onClick={() => makeTask(item.id)}>
                        Make this a task
                      </button>
                    )}
                  </div>
                )}
                {status === 'issue' && !r?.note && (r?.photoIds.length ?? 0) === 0 && (
                  <div style={{ padding: '0 4px 10px 4px' }}>
                    <button className="btn sm" onClick={() => makeTask(item.id)}>Make this a task</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div className="card card-pad">
        <Field label="Overall notes">
          <TextArea value={w.overallNote}
            placeholder="Anything that doesn't fit a line item — conversations with the super, conditions to watch."
            onChange={(e) => saveWalkthrough({ ...w, overallNote: e.target.value })} />
        </Field>
      </div>

      <div className="row wrapping" style={{ marginTop: 16, gap: 9 }}>
        {!w.completedAt ? (
          <button className="btn accent" onClick={() => saveWalkthrough({ ...w, completedAt: new Date().toISOString() })}>
            Finish walkthrough
          </button>
        ) : (
          <button className="btn" onClick={() => saveWalkthrough({ ...w, completedAt: null })}>Reopen</button>
        )}
        <button className="btn" onClick={() => window.print()}>Print / save PDF</button>
        <span className="spacer" />
        <ConfirmButton label="Delete"
          onConfirm={() => { deleteWalkthrough(w.id); navigate('/walkthroughs') }} />
      </div>

      {active && (
        <Modal title={labelFor(active.itemId)} onClose={() => setNoteFor(null)}
          footer={<><span className="spacer" />
            <button className="btn primary" onClick={() => setNoteFor(null)}>Done</button></>}>
          <div className="stack">
            <Field label="Note">
              <TextArea autoFocus value={active.note}
                placeholder="What you saw, and what it needs."
                onChange={(e) => update(active.itemId, { note: e.target.value })} />
            </Field>
            <Field label="Photos">
              <PhotoStrip ids={active.photoIds}
                onChange={(ids) => update(active.itemId, { photoIds: ids })} />
            </Field>
            {active.status === 'issue' && (
              <button className="btn accent block" onClick={() => makeTask(active.itemId)}>
                Make this a task
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
