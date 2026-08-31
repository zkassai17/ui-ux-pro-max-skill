/**
 * Photos live in IndexedDB, not localStorage — a handful of walkthrough shots
 * would blow the ~5MB localStorage budget on its own. Images are downscaled and
 * re-encoded to JPEG before storage so a phone photo lands around 80–150KB.
 */

const DB_NAME = 'rocksolid-photos'
const STORE = 'photos'
const MAX_EDGE = 1400
const QUALITY = 0.72

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE)
        }
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

/** Downscale to MAX_EDGE on the long side and re-encode as JPEG. */
export function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not decode image'))
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas unavailable'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', QUALITY))
      }
      img.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

export async function savePhoto(file: File): Promise<string> {
  const dataUrl = await compress(file)
  const id = `ph_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  await tx('readwrite', (s) => s.put(dataUrl, id))
  return id
}

export async function getPhoto(id: string): Promise<string | null> {
  try {
    const v = await tx<string>('readonly', (s) => s.get(id))
    return v ?? null
  } catch {
    return null
  }
}

export async function deletePhoto(id: string): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(id))
  } catch {
    /* a missing photo is not worth surfacing */
  }
}

export async function allPhotos(): Promise<Record<string, string>> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const out: Record<string, string> = {}
    const t = db.transaction(STORE, 'readonly')
    const req = t.objectStore(STORE).openCursor()
    req.onsuccess = () => {
      const cur = req.result
      if (cur) {
        out[String(cur.key)] = cur.value as string
        cur.continue()
      } else {
        resolve(out)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

export async function restorePhotos(map: Record<string, string>): Promise<void> {
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite')
    const store = t.objectStore(STORE)
    for (const [k, v] of Object.entries(map)) store.put(v, k)
    t.oncomplete = () => resolve()
    t.onerror = () => reject(t.error)
  })
}

export async function clearPhotos(): Promise<void> {
  await tx('readwrite', (s) => s.clear())
}

export async function photoStats(): Promise<{ count: number; bytes: number }> {
  const map = await allPhotos()
  const values = Object.values(map)
  return {
    count: values.length,
    // base64 carries ~4 chars per 3 bytes
    bytes: values.reduce((sum, v) => sum + Math.round((v.length * 3) / 4), 0),
  }
}
