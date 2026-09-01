import { useEffect, useRef, useState } from 'react'
import type { Database } from '../types'
import { describeReseed, emptyDatabase, readDB, replaceAll, reseed, storageBytes } from '../store'
import { allPhotos, clearPhotos, flushToDrive, photoStats, restorePhotos } from '../lib/photos'
import {
  connect as driveConnect, disconnect as driveDisconnect,
  getClientId, isConnected as driveConnected, setClientId,
} from '../lib/drive'
import { todayISO } from '../lib/dates'
import { offerFile } from '../lib/download'
import { requestDurableStorage, storageStatus, type StorageStatus } from '../lib/storage'
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
  const [photos, setPhotos] = useState({ count: 0, bytes: 0, pending: 0, inDrive: 0 })
  const [clientId, setId] = useState(getClientId)
  const [drive, setDrive] = useState(driveConnected)
  const [busy, setBusy] = useState(false)
  const [storage, setStorage] = useState<StorageStatus | null>(null)
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { photoStats().then(setPhotos) }, [db])
  useEffect(() => { storageStatus().then(setStorage) }, [db])

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
               ['Photos', photos.count], ['In Drive', photos.inDrive]] as const).map(([l, n]) => (
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

          {storage?.supported && (
            <div className={`banner ${storage.durable ? '' : 'warn'}`} style={{ marginTop: 12 }}>
              <span className="b-icon">{storage.durable ? '🔒' : '⚠️'}</span>
              <div>
                {storage.durable ? (
                  <>
                    <strong>Storage is protected.</strong> The browser won't clear your photos to
                    free up space. Using {storage.usedMB} MB of {storage.quotaMB} MB.
                  </>
                ) : (
                  <>
                    <strong>Storage isn't protected yet.</strong> The browser is allowed to clear
                    your photos if it needs space, and on iPhone site data can go after a week of not
                    opening the app. Adding it to your home screen usually fixes this.{' '}
                    <button className="linklike"
                      onClick={() => requestDurableStorage().then(() => storageStatus().then(setStorage))}>
                      Ask again
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section">
        <SectionHead title="Google Drive" />
        <div className="card card-pad stack">
          <p className="small muted">
            Files each photo into <strong>Rock Solid ▸ [building address]</strong> in your Drive,
            then keeps only a thumbnail on this phone — so a year of walks costs tens of megabytes
            here instead of hundreds. Photos are saved on the device first and uploaded after, so
            losing signal never loses a photo.
          </p>

          {!clientId ? (
            <>
              <Field label="Google client ID"
                hint="One-time setup — I'll walk you through getting this.">
                <input className="input" value={clientId} placeholder="…apps.googleusercontent.com"
                  onChange={(e) => setId(e.target.value)} />
              </Field>
              <div>
                <button className="btn" disabled={!clientId.trim().endsWith('.apps.googleusercontent.com')}
                  onClick={() => { setClientId(clientId); flash('Saved — now press Connect') }}>
                  Save client ID
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={`banner ${drive ? '' : 'warn'}`}>
                <span className="b-icon">{drive ? '✓' : '○'}</span>
                <div>
                  {drive
                    ? <><strong>Connected.</strong> {photos.inDrive} photo{photos.inDrive === 1 ? '' : 's'} in
                        Drive{photos.pending > 0 && <>, {photos.pending} waiting to go up</>}.</>
                    : <><strong>Not connected.</strong> Google sign-in lasts about an hour, so you'll
                        reconnect now and then. {photos.pending > 0 &&
                        <>{photos.pending} photo{photos.pending === 1 ? '' : 's'} waiting.</>}</>}
                </div>
              </div>
              <div className="row wrapping">
                {drive ? (
                  <>
                    <button className="btn accent" disabled={busy || photos.pending === 0}
                      onClick={async () => {
                        setBusy(true)
                        const r = await flushToDrive()
                        setBusy(false)
                        photoStats().then(setPhotos)
                        flash(r.sent ? `Sent ${r.sent} photo${r.sent === 1 ? '' : 's'}`
                          : r.failed ? 'Upload failed — try again' : 'Nothing waiting')
                      }}>
                      {busy ? 'Sending…' : 'Upload waiting photos'}
                    </button>
                    <button className="btn" onClick={() => { driveDisconnect(); setDrive(false) }}>
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button className="btn accent" disabled={busy} onClick={async () => {
                    setBusy(true)
                    try {
                      const ok = await driveConnect()
                      setDrive(ok)
                      if (ok) { await flushToDrive(); photoStats().then(setPhotos) }
                      flash(ok ? 'Connected to Drive' : 'Sign-in cancelled')
                    } catch (err) {
                      flash(err instanceof Error ? err.message : 'Could not connect')
                    } finally { setBusy(false) }
                  }}>Connect Google Drive</button>
                )}
                <button className="btn ghost sm" onClick={() => { setClientId(''); setId(''); driveDisconnect(); setDrive(false) }}>
                  Change client ID
                </button>
              </div>
            </>
          )}
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
            <button className="btn sm" onClick={() => flash(describeReseed(reseed()))}>
              Sync my buildings
            </button>
            <ConfirmButton label="Erase everything"
              onConfirm={async () => { replaceAll(emptyDatabase()); await clearPhotos(); flash('Erased') }} />
          </div>
          <p className="tiny muted">
            Syncing fills in any buildings or units missing from this device — matched on address and
            unit label, so it never duplicates and never overwrites what you've edited. Erasing cannot
            be undone.
          </p>
        </div>
      </div>
    </div>
  )
}
