import { useMemo, useState } from 'react'
import type { Database } from '../types'
import { newUnit, saveUnit } from '../actions'
import { unitsFor } from '../selectors'
import { Field, Modal, TextArea, TextInput } from './ui'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/**
 * Getting a real unit roster in without typing each one. Two ways, because NYC
 * stock splits about evenly: regular buildings generate from floors × letters,
 * irregular walk-ups get pasted from whatever list the office already has.
 */
export function BulkUnits({ db, propertyId, onClose }: {
  db: Database; propertyId: string; onClose: () => void
}) {
  const [mode, setMode] = useState<'generate' | 'paste'>('generate')
  const [fromFloor, setFromFloor] = useState('1')
  const [toFloor, setToFloor] = useState('5')
  const [perFloor, setPerFloor] = useState('4')
  const [pasted, setPasted] = useState('')

  const existing = useMemo(
    () => new Set(unitsFor(db, propertyId).map((u) => u.label.trim().toLowerCase())),
    [db, propertyId],
  )

  const labels = useMemo(() => {
    let out: string[] = []
    if (mode === 'generate') {
      const a = parseInt(fromFloor, 10)
      const b = parseInt(toFloor, 10)
      const n = parseInt(perFloor, 10)
      if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(n)) return []
      if (b < a || n < 1 || n > 26 || b - a > 60) return []
      for (let f = a; f <= b; f++) {
        for (let i = 0; i < n; i++) out.push(`${f}${LETTERS[i]}`)
      }
    } else {
      out = pasted.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
    }
    // Drop anything already on the building, and any repeat inside this batch.
    const seen = new Set<string>()
    return out.filter((l) => {
      const k = l.toLowerCase()
      if (existing.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [mode, fromFloor, toFloor, perFloor, pasted, existing])

  const skipped = mode === 'paste'
    ? pasted.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).length - labels.length
    : 0

  function add() {
    for (const label of labels) saveUnit({ ...newUnit(propertyId), label })
    onClose()
  }

  return (
    <Modal
      title="Add units in bulk"
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn accent" onClick={add} disabled={labels.length === 0}>
            Add {labels.length || ''} unit{labels.length === 1 ? '' : 's'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="chip-row">
          <button className={`chip ${mode === 'generate' ? 'on' : ''}`} onClick={() => setMode('generate')}>
            Floors × letters
          </button>
          <button className={`chip ${mode === 'paste' ? 'on' : ''}`} onClick={() => setMode('paste')}>
            Paste a list
          </button>
        </div>

        {mode === 'generate' ? (
          <>
            <div className="form-grid two">
              <Field label="From floor">
                <TextInput type="number" min={0} value={fromFloor}
                  onChange={(e) => setFromFloor(e.target.value)} />
              </Field>
              <Field label="To floor">
                <TextInput type="number" min={0} value={toFloor}
                  onChange={(e) => setToFloor(e.target.value)} />
              </Field>
            </div>
            <Field label="Units per floor" hint="Lettered A onward — 4 gives you 1A, 1B, 1C, 1D.">
              <TextInput type="number" min={1} max={26} value={perFloor}
                onChange={(e) => setPerFloor(e.target.value)} />
            </Field>
          </>
        ) : (
          <Field label="Unit numbers"
            hint="One per line, or separated by commas. Anything goes — 3B, PH, Retail 1, Rear.">
            <TextArea autoFocus value={pasted} style={{ minHeight: 130 }}
              placeholder={'1A\n1B\n2A\n2B\nPH\nRetail'}
              onChange={(e) => setPasted(e.target.value)} />
          </Field>
        )}

        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Will add {labels.length} unit{labels.length === 1 ? '' : 's'}
          </div>
          {labels.length === 0 ? (
            <p className="small muted">
              {mode === 'generate'
                ? 'Check the floor range — nothing to add yet.'
                : 'Paste some unit numbers above.'}
            </p>
          ) : (
            <div className="row wrapping" style={{ gap: 5 }}>
              {labels.slice(0, 60).map((l) => <span className="badge" key={l}>{l}</span>)}
              {labels.length > 60 && <span className="small muted">+{labels.length - 60} more</span>}
            </div>
          )}
          {skipped > 0 && (
            <p className="tiny muted" style={{ marginTop: 7 }}>
              {skipped} skipped — already on this building, or repeated in your list.
            </p>
          )}
        </div>

        <p className="tiny muted">
          These come in vacant with no tenant. Fill in tenants and rents as you learn them, or
          leave them — you can log problems against a unit either way.
        </p>
      </div>
    </Modal>
  )
}
