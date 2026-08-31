import { useEffect, useRef, useState } from 'react'
import type { Database } from '../types'
import { readDB, replaceAll, storageBytes } from '../store'
import { allPhotos, clearPhotos, photoStats, restorePhotos } from '../lib/photos'
import { demoDatabase, emptyDatabase } from '../seed'
import { todayISO } from '../lib/dates'
import { offerFile } from '../lib/download'
import { ConfirmButton, Field, Modal, SectionHead } from '../components/ui'
import { describeReport, mergeDatabase } from '../merge'

type Theme = 'system' | 'light' | 'dark'
const THEME_KEY = 'rocksolid.theme'

export function readTheme(): Theme {
  return (localStorage.getItem(THEME_KEY) as Theme) || 'system'
}

export function applyTheme(t: Theme) {
  const root = document.documentElement
  if (t === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
  localStorage.setItem(THEME_KEY, t)
}

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function Settings({ db }: { db: Database }) {
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [photos, setPhotos] = useState({ count: 0, bytes: 0 })
  const [status, setStatus] = useState('')
  const [pending, setPending] = useState<{ data: Database; photos?: Record<string, string> } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { photoStats().then(setPhotos) }, [db])

  function flash(msg: string) {
    setStatus(msg)
    setTimeout(() => setStatus(''), 3000)
  }

  async function exportAll() {
    const payload = { exportedAt: new Date().toISOString(), data: readDB(), photos: await allPhotos() }
    const outcome = await offerFile(
      `rocksolid-backup-${todayISO()}.json`,
      JSON.stringify(payload),
    )
    flash(
      outcome === 'saved' ? 'Backup saved'
        : outcome === 'declined' ? 'Save cancelled'
        : 'Could not save the backup here',
    )
  }

  async function importFile(file: File) {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      const data: Database = parsed.data ?? parsed
      if (!data || !Array.isArray(data.properties)) throw new Error('Not a Rock Solid backup')
      setPending({ data, photos: parsed.photos })
    } catch (err) {
      flash(`Import failed — ${err instanceof Error ? err.message : 'unreadable file'}`)
    }
  }

  async function applyImport(mode: 'merge' | 'replace') {
    if (!pending) return
    const { data, photos } = pending
    setPending(null)
    if (mode === 'replace') {
      replaceAll(data)
      flash('Everything replaced')
    } else {
      flash(describeReport(mergeDatabase(data)))
    }
    if (photos) await restorePhotos(photos)
  }

  const counts = [
    ['Buildings', db.properties.length],
    ['Units', db.units.length],
    ['Tasks', db.tasks.length],
    ['Notes', db.notes.length],
    ['Filings', db.compliance.length],
    ['Walkthroughs', db.walkthroughs.length],
    ['Arrears entries', db.arrears.length],
    ['Photos', photos.count],
  ] as const

  return (
    <div className="page">
      <div className="section">
        <SectionHead title="Your data" />
        <div className="card card-pad">
          <div className="stats" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {counts.map(([label, n]) => (
              <div key={label}>
                <div className="label eyebrow">{label}</div>
                <div className="display tabular" style={{ fontSize: 21 }}>{n}</div>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            Records use {fmtBytes(storageBytes())} of browser storage; photos use {fmtBytes(photos.bytes)}
            {' '}in a separate database. Everything lives in <strong>this browser on this device</strong> —
            clearing site data wipes it. Export regularly.
          </p>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Backup" />
        <div className="card card-pad stack">
          <p className="small muted">
            One JSON file with every record and photo. Use it to move to another machine, or as
            insurance before you clear anything.
          </p>
          <div className="row wrapping">
            <button className="btn accent" onClick={exportAll}>Export backup</button>
            <button className="btn" onClick={() => fileRef.current?.click()}>Import backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) importFile(f)
                e.target.value = ''
              }} />
            {status && <span className="small" style={{ color: 'var(--ok)' }}>{status}</span>}
          </div>
          <p className="tiny muted">
            You choose whether to merge or replace once the file is read. Merging matches
            buildings on address, so importing a list twice won't duplicate anything.
          </p>
        </div>
      </div>

      {pending && (
        <Modal title="Import" onClose={() => setPending(null)}
          footer={<>
            <span className="spacer" />
            <button className="btn" onClick={() => setPending(null)}>Cancel</button>
            <button className="btn" onClick={() => applyImport('replace')}>Replace everything</button>
            <button className="btn accent" onClick={() => applyImport('merge')}>Merge in</button>
          </>}>
          <div className="stack">
            <p className="small">
              That file holds <strong>{pending.data.properties.length} buildings</strong>
              {pending.data.units?.length ? <> and <strong>{pending.data.units.length} units</strong></> : null}
              {pending.data.tasks?.length ? <>, {pending.data.tasks.length} tasks</> : null}
              {pending.data.compliance?.length ? <>, {pending.data.compliance.length} filings</> : null}.
            </p>
            <div className="banner">
              <span className="b-icon">＋</span>
              <div><strong>Merge in</strong> keeps everything you already have and adds what's new.
                Buildings are matched on address, so nothing doubles up.</div>
            </div>
            <div className="banner warn">
              <span className="b-icon">⚠️</span>
              <div><strong>Replace everything</strong> discards your current data first. Use it when
                you're restoring a backup onto a fresh device.</div>
            </div>
          </div>
        </Modal>
      )}

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
        <SectionHead title="Demo data" />
        <div className="card card-pad stack">
          <p className="small muted">
            Three sample Manhattan buildings with tasks, filings, arrears and notes, so you can see how
            the screens behave before your own work is in here. Loading it replaces everything.
          </p>
          <div className="row wrapping">
            <ConfirmButton label="Load demo portfolio" className="btn sm"
              onConfirm={() => { replaceAll(demoDatabase()); flash('Demo data loaded') }} />
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead title="Danger zone" />
        <div className="card card-pad stack">
          <p className="small muted">
            Deletes every building, unit, task, note, filing, walkthrough, arrears entry and photo in
            this browser. Export first — there is no undo.
          </p>
          <div>
            <ConfirmButton label="Erase everything"
              onConfirm={async () => { replaceAll(emptyDatabase()); await clearPhotos(); flash('All data erased') }} />
          </div>
        </div>
      </div>

      <div className="section">
        <SectionHead title="About" />
        <div className="card card-pad">
          <p className="small" style={{ lineHeight: 1.6 }}>
            <strong>Rock Solid</strong> — a property manager's working notebook, built for NYC
            multifamily and mixed-use stock. It runs entirely on your device; nothing is uploaded
            and there is no account.
          </p>
          <p className="small muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
            The compliance dates it ships with are a reminder scaffold, not legal advice. Filing
            cycles for LL11, LL152 and LL87 vary by building, thresholds change, and only the
            agencies are authoritative. Verify before you file.
          </p>
        </div>
      </div>
    </div>
  )
}
