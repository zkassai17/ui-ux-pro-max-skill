import { useMemo, useState } from 'react'
import type { Database, Note } from '../types'
import { addNote, deleteNote, saveNote, togglePin } from '../actions'
import { locationLabel } from '../selectors'
import { unitsFor } from '../selectors'
import { formatStamp } from '../lib/dates'
import {
  Badge, ConfirmButton, Empty, Field, Modal, PhotoStrip, SectionHead, TextArea,
} from '../components/ui'

export function Notes({ db }: { db: Database }) {
  const [query, setQuery] = useState('')
  const [propertyId, setPropertyId] = useState('')
  const [editing, setEditing] = useState<Note | null>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = db.notes.filter((n) => {
      if (propertyId && n.propertyId !== propertyId) return false
      if (q && !n.body.toLowerCase().includes(q)) return false
      return true
    })
    // Pinned notes float, everything else stays newest-first.
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
      return b.createdAt.localeCompare(a.createdAt)
    })
  }, [db.notes, query, propertyId])

  return (
    <div className="page">
      <div className="row wrapping" style={{ marginBottom: 16 }}>
        <input className="input" style={{ flex: '1 1 200px' }} placeholder="Search notes…"
          value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="select" style={{ width: 'auto', flex: '0 1 190px' }}
          value={propertyId} onChange={(e) => setPropertyId(e.target.value)} aria-label="Filter by building">
          <option value="">All buildings</option>
          {db.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <SectionHead title="Notes" count={visible.length}>
        <button className="btn accent sm"
          onClick={() => setEditing(addNote({ propertyId: propertyId || null }))}>＋ New note</button>
      </SectionHead>

      {visible.length === 0 ? (
        <Empty icon="📝" title={query || propertyId ? 'No matching notes' : 'No notes yet'}
          body={query || propertyId
            ? 'Try a different search or clear the building filter.'
            : 'Capture anything from the Today screen. Notes are timestamped and searchable forever — that is the whole point of them.'} />
      ) : visible.map((n) => (
        <div className={`note ${n.pinned ? 'pinned' : ''}`} key={n.id}>
          <div className="note-body">{n.body || <span className="muted">Empty note</span>}</div>
          {n.photoIds.length > 0 && (
            <div style={{ marginTop: 9 }}><PhotoStrip ids={n.photoIds} /></div>
          )}
          <div className="note-meta">
            <span>{formatStamp(n.createdAt)}</span>
            {n.propertyId && <Badge>{locationLabel(db, n.propertyId, n.unitId)}</Badge>}
            {n.tags.map((t) => <Badge key={t} tone="blue">#{t}</Badge>)}
            <span className="spacer" />
            <button className="iconbtn" onClick={() => togglePin(n.id)}
              aria-label={n.pinned ? 'Unpin' : 'Pin'} title={n.pinned ? 'Unpin' : 'Pin'}>
              {n.pinned ? '📌' : '📍'}
            </button>
            <button className="iconbtn" onClick={() => setEditing(n)} aria-label="Edit note">✏️</button>
          </div>
        </div>
      ))}

      {editing && <NoteEditor db={db} note={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function NoteEditor({ db, note, onClose }: { db: Database; note: Note; onClose: () => void }) {
  const [draft, setDraft] = useState(note)
  const set = <K extends keyof Note>(k: K, v: Note[K]) => setDraft((d) => ({ ...d, [k]: v }))
  const units = draft.propertyId ? unitsFor(db, draft.propertyId) : []

  return (
    <Modal
      title="Note"
      onClose={onClose}
      footer={
        <>
          <ConfirmButton label="Delete" onConfirm={() => { deleteNote(draft.id); onClose() }} />
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={() => { saveNote(draft); onClose() }}>Save</button>
        </>
      }
    >
      <div className="stack">
        <Field label="Note">
          <TextArea autoFocus value={draft.body} style={{ minHeight: 150 }}
            onChange={(e) => set('body', e.target.value)} />
        </Field>
        <div className="form-grid two">
          <Field label="Building">
            <select className="select" value={draft.propertyId ?? ''}
              onChange={(e) => { set('propertyId', e.target.value || null); set('unitId', null) }}>
              <option value="">— none —</option>
              {db.properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Unit">
            <select className="select" value={draft.unitId ?? ''} disabled={!draft.propertyId}
              onChange={(e) => set('unitId', e.target.value || null)}>
              <option value="">— whole building —</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Tags" hint="Comma separated — heat, owner, walkthrough, legal.">
          <input className="input" value={draft.tags.join(', ')}
            onChange={(e) => set('tags', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
        </Field>
        <Field label="Photos">
          <PhotoStrip ids={draft.photoIds} onChange={(ids) => set('photoIds', ids)} />
        </Field>
        <label className="check">
          <input type="checkbox" checked={draft.pinned} onChange={(e) => set('pinned', e.target.checked)} />
          <span>Pin to the top</span>
        </label>
      </div>
    </Modal>
  )
}
