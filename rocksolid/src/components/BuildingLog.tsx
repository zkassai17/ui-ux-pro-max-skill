import { useState } from 'react'
import type { Database } from '../types'
import { addNote, deleteNote, saveNote } from '../actions'
import { formatStamp } from '../lib/dates'
import { outcomeMessage, sendAsText } from '../lib/share'
import { noteToText } from '../lib/noteText'
import { ConfirmButton, Empty, PhotoStrip, TextArea } from './ui'

/**
 * The building's visit history: one dated entry per time you walk it, with the
 * photos from that visit. Read top to bottom it answers the only question that
 * matters about a recurring problem — is this getting better, or is it the same
 * thing every month?
 *
 * Entries are ordinary notes tagged to the building, so they stay searchable
 * from the Notes screen and can be texted like anything else.
 */
export function BuildingLog({ db, propertyId }: { db: Database; propertyId: string }) {
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [flash, setFlash] = useState('')

  const entries = db.notes
    .filter((n) => n.propertyId === propertyId && !n.unitId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  function post() {
    if (!body.trim() && photos.length === 0) return
    addNote({
      body: body.trim() || 'Site visit',
      propertyId,
      photoIds: photos,
      tags: ['visit'],
    })
    setBody('')
    setPhotos([])
  }

  async function text(t: string) {
    setFlash(outcomeMessage(await sendAsText(t)))
    setTimeout(() => setFlash(''), 2600)
  }

  return (
    <>
      <div className="capture" style={{ marginBottom: 18 }}>
        <TextArea
          value={body}
          style={{ border: 'none', background: 'none', minHeight: 62, padding: 0 }}
          placeholder="What did you see today? Snap the same spots each visit and the history below does the comparing."
          onChange={(e) => setBody(e.target.value)}
        />
        <div style={{ paddingTop: 10, marginTop: 4, borderTop: '1px solid var(--line-soft)' }}>
          <PhotoStrip ids={photos} onChange={setPhotos} />
          <div className="row" style={{ marginTop: 10 }}>
            {flash && <span className="tiny" style={{ color: 'var(--ok)' }}>{flash}</span>}
            <span className="spacer" />
            <button className="btn accent sm" onClick={post}
              disabled={!body.trim() && photos.length === 0}>
              Log this visit
            </button>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <Empty icon="📷" title="No visits logged"
          body="Every time you walk the building, drop a line and a few photos here. Over a few months this becomes the record of whether anything actually improved." />
      ) : (
        entries.map((n) => (
          <div className="note" key={n.id} style={{ marginBottom: 10 }}>
            <div className="row" style={{ marginBottom: 6 }}>
              <span className="eyebrow">{formatStamp(n.createdAt)}</span>
              <span className="spacer" />
              <button className="btn ghost sm" onClick={() => text(noteToText(db, n))}>Text</button>
              <ConfirmButton label="Delete" className="btn ghost sm"
                onConfirm={() => deleteNote(n.id)} />
            </div>
            <TextArea
              value={n.body}
              style={{ border: 'none', background: 'none', padding: 0, minHeight: 0 }}
              onChange={(e) => saveNote({ ...n, body: e.target.value })}
            />
            {n.photoIds.length > 0 && (
              <div style={{ marginTop: 9 }}>
                <PhotoStrip ids={n.photoIds}
                  onChange={(ids) => saveNote({ ...n, photoIds: ids })} />
              </div>
            )}
          </div>
        ))
      )}
    </>
  )
}
