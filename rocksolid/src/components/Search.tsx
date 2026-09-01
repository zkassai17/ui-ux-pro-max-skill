import { useEffect, useMemo, useRef, useState } from 'react'
import type { Database } from '../types'
import { KIND_LABEL, search } from '../search'
import { navigate } from '../router'
import { Badge, Empty } from './ui'

/** Search over everything written down, opened from the header. */
export function Search({ db, onClose }: { db: Database; onClose: () => void }) {
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const hits = useMemo(() => search(db, q), [db, q])
  const tooShort = q.trim().length > 0 && q.trim().length < 2

  function go(href: string) {
    onClose()
    navigate(href)
  }

  return (
    <div className="search-sheet">
      <div className="search-bar">
        <input ref={inputRef} className="input" value={q}
          placeholder="Leak, 4B, boiler, a tenant's name…"
          onChange={(e) => setQ(e.target.value)} />
        <button className="btn" onClick={onClose}>Close</button>
      </div>

      <div className="search-results">
        {q.trim().length === 0 ? (
          <p className="small muted" style={{ padding: '20px 4px' }}>
            Searches every unit, to-do, visit and note — including what you wrote against a
            checklist line months ago.
          </p>
        ) : tooShort ? (
          <p className="small muted" style={{ padding: '20px 4px' }}>Keep typing…</p>
        ) : hits.length === 0 ? (
          <Empty icon="🔍" title="Nothing found" body={`No match for “${q.trim()}”.`} />
        ) : (
          <>
            <p className="tiny muted" style={{ padding: '4px 2px 10px' }}>
              {hits.length} result{hits.length === 1 ? '' : 's'}
            </p>
            {hits.map((h) => (
              <button key={`${h.kind}-${h.id}`} className="rowcard" onClick={() => go(h.href)}>
                <span className="rowcard-body">
                  <span className="rowcard-title">{h.title}</span>
                  <span className="rowcard-meta">
                    <Badge>{KIND_LABEL[h.kind]}</Badge>
                    {h.where && <span className="truncate">{h.where}</span>}
                    {h.date && <span>· {h.date}</span>}
                  </span>
                  {h.snippet && (
                    <span className="small muted wrap" style={{ marginTop: 5, display: 'block' }}>
                      {h.snippet}
                    </span>
                  )}
                </span>
                <span className="muted">›</span>
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
