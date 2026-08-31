import { useEffect, useRef, useState } from 'react'
import type { Database } from '../types'
import { emptyDatabase, readDB, replaceAll, reseed, storageBytes } from '../store'
import { allPhotos, clearPhotos, photoStats, restorePhotos } from '../lib/photos'
import { todayISO } from '../lib/dates'
import { offerFile } from '../lib/download'
import { ConfirmButton, Field, SectionHead } from '../components/ui'

type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'rocksolid.theme'

export const readTheme = (): Theme => (localStorage.getItem(THEME_KEY) as Theme) || 'system'

export function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
  localStorage.setItem(THEME_KEY, t)
}

const fmt = (n: number) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : `${(n / 1048576).toFixed(1)} MB`

export function Settings({ db }: { db: Database }) {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [photos, setPhotos] = useState({ count: 0, bytes: 0 })
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { photoStats().then(setPhotos) }, [db])

  const flash = (m: string) => { setStatus(m); setTimeout(() => setStatus(''), 3000) }

  async function exportAll() {
    const payload = { exportedAt: new Date().toISOString(), data: readDB(), photos: await allPhotos() }
    const r = await offerFile(`rocksolid-backup-${todayISO()}.json`, JSON.stringify(payload))
    flash(r === 'saved' ? 'Backup saved' : r === 'declined' ? 'Cancelled' : 'Could not save here')
  }

  async function importFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text())
      const data = parsed.data ?? parsed
      replaceAll(data)
      if (parsed.photos) await restorePhotos(parsed.photos)
      flash('Backup restored')
    } catch {
      flash('That file could not be read')
    }
  }

  return (
    <div className="page">
      <div className="section">
        <SectionHead title="Your data" />
        <div className="card card-pad">
          <div className="stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {([['Buildings', db.buildings.length], ['Units', db.units.length],
               ['To-dos', db.todos.length], ['Notes', db.entries.length],
               ['Photos', photos.count]] as const).map(([l, n]) => (
              <div key={l}>
                <div className="eyebrow">{l}</div>
                <div className="display tabular" style={{ fontSize: 21 }}>{n}</div>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            {fmt(storageBytes())} of records, {fmt(photos.bytes)} of photos — all in this browser on
            this device. Clearing site data wipes it, so export now and then.
          </p>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Backup" />
        <div className="card card-pad stack">
          <div className="row wrapping">
            <button className="btn accent" onClick={exportAll}>Export</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>Import</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = '' }} />
            {status && <span className="small" style={{ color: 'var(--ok)' }}>{status}</span>}
          </div>
          <p className="tiny muted">One file with every record and photo. Importing replaces what's here.</p>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Appearance" />
        <div className="card card-pad">
          <Field label="Theme">
            <div className="chip-row">
              {(['system', 'light', 'dark'] as Theme[]).map((t) => (
                <button key={t} className={`chip ${theme === t ? 'on' : ''}`}
                  onClick={() => { setTheme(t); applyTheme(t) }}>
                  {t === 'system' ? 'Match system' : t === 'light' ? 'Light' : 'Dark'}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Reset" />
        <div className="card card-pad stack">
          <div className="row wrapping">
            <button className="btn sm" onClick={() => {
              const n = reseed()
              flash(n ? `Added ${n} building${n === 1 ? '' : 's'}` : 'All already here')
            }}>Reload my buildings</button>
            <ConfirmButton label="Erase everything"
              onConfirm={async () => { replaceAll(emptyDatabase()); await clearPhotos(); flash('Erased') }} />
          </div>
          <p className="tiny muted">
            Reloading your buildings matches on address, so it never duplicates. Erasing cannot be undone.
          </p>
        </div>
      </div>
    </div>
  )
}
