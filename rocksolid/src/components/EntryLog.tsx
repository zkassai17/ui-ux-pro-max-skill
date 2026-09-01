import { useState } from 'react'
import type { Database, Entry } from '../types'
import { addEntry, deleteEntry, saveEntry } from '../actions'
import { entriesFor } from '../selectors'
import { formatStamp } from '../lib/dates'
import { outcomeMessage, sendAsText } from '../lib/share'
import { ConfirmButton, Empty, PhotoStrip, TextArea } from './ui'

/**
 * A dated stream of notes and photos, used two ways: on a building it's the
 * record of each visit, on a unit it's what happened when you knocked.
 * Newest first, because the last thing that happened is what you came to check.
 */
export function EntryLog({ db, buildingId, unitId, placeholder, emptyBody }: {
  db: Database
  buildingId: string | null
  unitId: string | null
  placeholder: string
  emptyBody: string
}) {
  const [body, setBody] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [flash, setFlash] = useState('')

  const entries = entriesFor(db, buildingId, unitId)
  const address = db.buildings.find((b) => b.id === buildingId)?.address ?? ''
  const unit = db.units.find((u) => u.id === unitId)?.label

  function post() {
    if (!body.trim() && photos.length === 0) return
    addEntry({ body: body.trim(), buildingId, unitId, photoIds: photos })
    setBody('')
    setPhotos([])
  }

  async function text(e: Entry) {
    const head = formatStamp(e.createdAt)
    setFlash(outcomeMessage(await sendAsText(`${head}\n\n${e.body}`)))
    setTimeout(() => setFlash(''), 2600)
  }

  return (
    <>
      <div className="capture" style={{ marginBottom: 16 }}>
        <TextArea value={body} placeholder={placeholder}
          style={{ border: 'none', background: 'none', minHeight: 58, padding: 0 }}
          onChange={(e) => setBody(e.target.value)} />
        <div style={{ paddingTop: 10, marginTop: 4, borderTop: '1px solid var(--line-soft)' }}>
          <PhotoStrip ids={photos} onChange={setPhotos}
            context={{ building: address, label: unit ? `Unit ${unit}` : 'Note' }} />
          <div className="row" style={{ marginTop: 10 }}>
            {flash && <span className="tiny" style={{ color: 'var(--ok)' }}>{flash}</span>}
            <span className="spacer" />
            <button className="btn accent sm" onClick={post}
              disabled={!body.trim() && photos.length === 0}>Save</button>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <Empty icon="📷" title="Nothing logged yet" body={emptyBody} />
      ) : entries.map((e) => (
        <div className="note" key={e.id} style={{ marginBottom: 9 }}>
          <div className="row" style={{ marginBottom: 5 }}>
            <span className="eyebrow">{formatStamp(e.createdAt)}</span>
            <span className="spacer" />
            <button className="btn ghost sm" onClick={() => text(e)}>Text</button>
            <ConfirmButton label="Delete" className="btn ghost sm"
              onConfirm={() => deleteEntry(e.id)} />
          </div>
          <TextArea value={e.body} placeholder="(photos only)"
            style={{ border: 'none', background: 'none', padding: 0, minHeight: 0 }}
            onChange={(ev) => saveEntry({ ...e, body: ev.target.value })} />
          {e.photoIds.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <PhotoStrip ids={e.photoIds}
                onChange={(ids) => saveEntry({ ...e, photoIds: ids })} />
            </div>
          )}
        </div>
      ))}
    </>
  )
}
