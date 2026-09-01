import { isConnected, uploadPhoto } from './drive'

/**
 * Photos live in IndexedDB, never localStorage — a handful would blow that
 * budget on their own.
 *
 * Each record keeps a thumbnail always, and the full-size image only until it
 * has been copied to Drive. Once uploaded the big one is dropped, so a year of
 * weekly walks costs the phone tens of megabytes instead of hundreds, and the
 * history still scrolls instantly with no signal.
 */

const DB_NAME = 'rocksolid-photos'
const STORE = 'photos'

const FULL_EDGE = 1200
const FULL_QUALITY = 0.68
const THUMB_EDGE = 420
const THUMB_QUALITY = 0.6

export interface PhotoRecord {
  /** Small, always present, always local. */
  thumb: string
  /** Full size — dropped once the photo is safely in Drive. */
  full?: string
  driveId?: string
  link?: string
  /** Where it belongs, so a queued upload knows its folder. */
  building?: string
  name?: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Records written before thumbnails existed were bare data URLs. */
function asRecord(v: unknown): PhotoRecord | null {
  if (!v) return null
  if (typeof v === 'string') return { thumb: v, full: v }
  return v as PhotoRecord
}

function shrink(file: File, edge: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read that image'))
      img.onload = () => {
        const scale = Math.min(1, edge / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas unavailable'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export interface PhotoContext { building?: string; label?: string }

export async function savePhoto(file: File, ctx: PhotoContext = {}): Promise<string> {
  const [full, thumb] = await Promise.all([
    shrink(file, FULL_EDGE, FULL_QUALITY),
    shrink(file, THUMB_EDGE, THUMB_QUALITY),
  ])
  const id = `ph_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  const stamp = new Date().toISOString().slice(0, 10)
  const name = `${stamp} ${ctx.label || 'Photo'}.jpg`.replace(/[/\\]/g, '-')

  await tx('readwrite', (s) => s.put({ thumb, full, building: ctx.building, name } as PhotoRecord, id))

  // Best-effort: the photo is already safe on the device.
  void flushToDrive()
  return id
}

/** What to display — the full image while it's here, the thumbnail after. */
export async function getPhoto(id: string): Promise<string | null> {
  try {
    const rec = asRecord(await tx<unknown>('readonly', (s) => s.get(id)))
    return rec ? rec.full ?? rec.thumb : null
  } catch {
    return null
  }
}

export async function getRecord(id: string): Promise<PhotoRecord | null> {
  try {
    return asRecord(await tx<unknown>('readonly', (s) => s.get(id)))
  } catch {
    return null
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try { await tx('readwrite', (s) => s.delete(id)) } catch { /* already gone */ }
}

async function allRecords(): Promise<Record<string, PhotoRecord>> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const out: Record<string, PhotoRecord> = {}
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).openCursor()
    req.onsuccess = () => {
      const cur = req.result
      if (cur) {
        const rec = asRecord(cur.value)
        if (rec) out[String(cur.key)] = rec
        cur.continue()
      } else resolve(out)
    }
    req.onerror = () => reject(req.error)
  })
}

let flushing = false

/**
 * Send anything still holding a full-size copy, then drop that copy. Runs after
 * every save and can be triggered by hand; never throws into the UI.
 */
export async function flushToDrive(): Promise<{ sent: number; failed: number }> {
  if (flushing || !isConnected()) return { sent: 0, failed: 0 }
  flushing = true
  let sent = 0, failed = 0
  try {
    const all = await allRecords()
    for (const [id, rec] of Object.entries(all)) {
      if (!rec.full || rec.driveId || !rec.building) continue
      try {
        const { id: driveId, link } = await uploadPhoto(rec.full, rec.building, rec.name ?? `${id}.jpg`)
        await tx('readwrite', (s) => s.put(
          { thumb: rec.thumb, driveId, link, building: rec.building, name: rec.name } as PhotoRecord,
          id,
        ))
        sent++
      } catch {
        failed++
      }
    }
  } finally {
    flushing = false
  }
  return { sent, failed }
}

export async function restorePhotos(map: Record<string, unknown>): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite')
    const store = t.objectStore(STORE)
    for (const [k, v] of Object.entries(map)) {
      const rec = asRecord(v)
      if (rec) store.put(rec, k)
    }
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function allPhotos(): Promise<Record<string, PhotoRecord>> {
  return allRecords()
}

export async function clearPhotos(): Promise<void> {
  await tx('readwrite', (s) => s.clear())
}

export async function photoStats(): Promise<{
  count: number; bytes: number; pending: number; inDrive: number
}> {
  const all = Object.values(await allRecords())
  const size = (s?: string) => (s ? Math.round((s.length * 3) / 4) : 0)
  return {
    count: all.length,
    bytes: all.reduce((n, r) => n + size(r.thumb) + size(r.full), 0),
    pending: all.filter((r) => r.full && !r.driveId).length,
    inDrive: all.filter((r) => r.driveId).length,
  }
}
