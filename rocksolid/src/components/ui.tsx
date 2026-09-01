import { useEffect, useRef, useState, type ReactNode } from 'react'
import { getPhoto, savePhoto, deletePhoto, type PhotoContext } from '../lib/photos'

// ---------- Modal ----------

export function Modal({ title, onClose, children, footer }: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="iconbtn spacer" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

// ---------- Form primitives ----------

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`input ${props.className ?? ''}`} />
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`textarea ${props.className ?? ''}`} />
}

export function Select({ options, ...props }: {
  options: { value: string; label: string }[]
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`select ${props.className ?? ''}`}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ---------- Display ----------

export function Badge({ tone = 'grey', children }: {
  tone?: 'grey' | 'red' | 'amber' | 'green' | 'blue' | 'orange' | 'solid-red'
  children: ReactNode
}) {
  return <span className={`badge ${tone === 'grey' ? '' : tone}`}>{children}</span>
}

export function SectionHead({ title, count, children }: {
  title: string; count?: number; children?: ReactNode
}) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {count !== undefined && <span className="count">{count}</span>}
      {children && <div className="spacer">{children}</div>}
    </div>
  )
}

export function Empty({ icon, title, body, action }: {
  icon: string; title: string; body: string; action?: ReactNode
}) {
  return (
    <div className="empty">
      <div className="e-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  )
}

/** Destructive actions ask once, inline, rather than through a window.confirm. */
export function ConfirmButton({ label, onConfirm, className = 'btn danger sm' }: {
  label: string; onConfirm: () => void; className?: string
}) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])

  if (armed) {
    return (
      <button className="btn danger sm" onClick={() => { onConfirm(); setArmed(false) }}>
        Tap again to confirm
      </button>
    )
  }
  return <button className={className} onClick={() => setArmed(true)}>{label}</button>
}

// ---------- Photos ----------

function Thumb({ id, onRemove }: { id: string; onRemove?: () => void }) {
  const [src, setSrc] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    getPhoto(id).then((v) => { if (alive) setSrc(v) })
    return () => { alive = false }
  }, [id])

  return (
    <div className="photo-thumb">
      {src
        ? <img src={src} alt="" onClick={() => window.open(src, '_blank')} />
        : <div style={{ width: '100%', height: '100%' }} />}
      {onRemove && <button className="x" onClick={onRemove} aria-label="Remove photo">✕</button>}
    </div>
  )
}

export function PhotoStrip({ ids, onChange, context }: {
  ids: string[]
  onChange?: (next: string[]) => void
  /** Building and label, so the photo can be filed in the right Drive folder. */
  context?: PhotoContext
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length || !onChange) return
    setBusy(true)
    try {
      const added: string[] = []
      for (const f of files) {
        if (!f.type.startsWith('image/')) continue
        added.push(await savePhoto(f, context))
      }
      onChange([...ids, ...added])
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function remove(id: string) {
    if (!onChange) return
    await deletePhoto(id)
    onChange(ids.filter((x) => x !== id))
  }

  if (!onChange && ids.length === 0) return null

  return (
    <div className="photo-strip">
      {ids.map((id) => (
        <Thumb key={id} id={id} onRemove={onChange ? () => remove(id) : undefined} />
      ))}
      {onChange && (
        <>
          <button className="photo-add" onClick={() => fileRef.current?.click()} aria-label="Add photo">
            {busy ? '…' : '＋'}
          </button>
          <input
            ref={fileRef} type="file" accept="image/*" multiple
            capture="environment" className="sr-only" onChange={onPick}
          />
        </>
      )}
    </div>
  )
}
