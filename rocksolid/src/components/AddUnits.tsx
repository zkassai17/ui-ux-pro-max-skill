import { useMemo, useState } from 'react'
import type { Database } from '../types'
import { addUnits } from '../actions'
import { unitsFor } from '../selectors'
import { Field, Modal, TextArea, TextInput } from './ui'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** Whole roster at once — generated for regular stock, pasted for everything else. */
export function AddUnits({ db, buildingId, onClose }: {
  db: Database; buildingId: string; onClose: () => void
}) {
  const [mode, setMode] = useState<'generate' | 'paste'>('generate')
  const [from, setFrom] = useState('1')
  const [to, setTo] = useState('5')
  const [per, setPer] = useState('4')
  const [pasted, setPasted] = useState('')

  const existing = useMemo(
    () => new Set(unitsFor(db, buildingId).map((u) => u.label.trim().toLowerCase())),
    [db, buildingId],
  )

  const labels = useMemo(() => {
    let out: string[] = []
    if (mode === 'generate') {
      const a = parseInt(from, 10), b = parseInt(to, 10), n = parseInt(per, 10)
      if (![a, b, n].every(Number.isFinite) || b < a || n < 1 || n > 26 || b - a > 60) return []
      for (let f = a; f <= b; f++) for (let i = 0; i < n; i++) out.push(`${f}${LETTERS[i]}`)
    } else {
      out = pasted.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)
    }
    const seen = new Set<string>()
    return out.filter((l) => {
      const k = l.toLowerCase()
      if (existing.has(k) || seen.has(k)) return false
      seen.add(k)
      return true
    })
  }, [mode, from, to, per, pasted, existing])

  return (
    <Modal title="Add units" onClose={onClose}
      footer={<>
        <span className="spacer" />
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn accent" disabled={!labels.length}
          onClick={() => { addUnits(buildingId, labels); onClose() }}>
          Add {labels.length || ''}
        </button>
      </>}>
      <div className="stack">
        <div className="chip-row">
          <button className={`chip ${mode === 'generate' ? 'on' : ''}`}
            onClick={() => setMode('generate')}>Floors × letters</button>
          <button className={`chip ${mode === 'paste' ? 'on' : ''}`}
            onClick={() => setMode('paste')}>Paste a list</button>
        </div>

        {mode === 'generate' ? (
          <div className="form-grid two">
            <Field label="From floor">
              <TextInput type="number" min={0} value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="To floor">
              <TextInput type="number" min={0} value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="Per floor" hint="4 gives 1A–1D.">
              <TextInput type="number" min={1} max={26} value={per}
                onChange={(e) => setPer(e.target.value)} />
            </Field>
          </div>
        ) : (
          <Field label="Unit numbers" hint="One per line or comma separated.">
            <TextArea autoFocus value={pasted} style={{ minHeight: 120 }}
              placeholder={'1A\n1B\n2A\nPH\nRear'}
              onChange={(e) => setPasted(e.target.value)} />
          </Field>
        )}

        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Adding {labels.length}</div>
          <div className="row wrapping" style={{ gap: 5 }}>
            {labels.slice(0, 50).map((l) => <span className="badge" key={l}>{l}</span>)}
            {labels.length > 50 && <span className="small muted">+{labels.length - 50}</span>}
          </div>
        </div>
      </div>
    </Modal>
  )
}
