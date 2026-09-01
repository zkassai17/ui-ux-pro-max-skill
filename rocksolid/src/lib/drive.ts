/**
 * Google Drive: a folder per building, photos filed into it.
 *
 * Scope is `drive.file` — access limited to files this app creates. That is the
 * one Drive scope Google treats as non-sensitive, so it needs no app review,
 * and it also means the app can never see the rest of your Drive.
 *
 * Browser-only OAuth issues an access token good for about an hour with no
 * refresh token, so uploading is always best-effort: the photo is saved on the
 * device first and sent afterwards. Losing the connection loses nothing.
 */

const ROOT_FOLDER = 'Rock Solid'
const CLIENT_ID_KEY = 'rocksolid.drive.clientId'
const FOLDERS_KEY = 'rocksolid.drive.folders'
const SCOPE = 'https://www.googleapis.com/auth/drive.file'

type TokenClient = { requestAccessToken: (o?: { prompt?: string }) => void }
type GoogleGlobal = {
  accounts: {
    oauth2: {
      initTokenClient: (c: {
        client_id: string
        scope: string
        callback: (r: { access_token?: string; error?: string; expires_in?: number }) => void
      }) => TokenClient
      revoke: (token: string, done: () => void) => void
    }
  }
}

let token: string | null = null
let tokenExpiry = 0
let client: TokenClient | null = null

export const getClientId = () => localStorage.getItem(CLIENT_ID_KEY) ?? ''
export const setClientId = (id: string) => localStorage.setItem(CLIENT_ID_KEY, id.trim())
export const isConfigured = () => getClientId().length > 0
export const isConnected = () => !!token && Date.now() < tokenExpiry

/** Load Google's identity script once. */
function loadGis(): Promise<GoogleGlobal> {
  const existing = (window as unknown as { google?: GoogleGlobal }).google
  if (existing?.accounts?.oauth2) return Promise.resolve(existing)

  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => {
      const g = (window as unknown as { google?: GoogleGlobal }).google
      g ? resolve(g) : reject(new Error('Google sign-in failed to load'))
    }
    s.onerror = () => reject(new Error('Could not reach Google — are you offline?'))
    document.head.appendChild(s)
  })
}

/** Ask for an access token. `prompt` empty reuses consent where possible. */
export async function connect(interactive = true): Promise<boolean> {
  const clientId = getClientId()
  if (!clientId) throw new Error('No Google client ID saved yet')
  if (isConnected()) return true

  const google = await loadGis()
  return new Promise<boolean>((resolve) => {
    client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (res) => {
        if (res.access_token) {
          token = res.access_token
          tokenExpiry = Date.now() + (res.expires_in ?? 3600) * 1000 - 60_000
          resolve(true)
        } else {
          resolve(false)
        }
      },
    })
    client.requestAccessToken({ prompt: interactive ? 'consent' : '' })
  })
}

export function disconnect() {
  token = null
  tokenExpiry = 0
  localStorage.removeItem(FOLDERS_KEY)
}

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  if (!isConnected()) throw new Error('Not connected to Google Drive')
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
  })
  if (res.status === 401) {
    token = null
    throw new Error('Google sign-in expired — reconnect in Settings')
  }
  if (!res.ok) throw new Error(`Drive said ${res.status}: ${(await res.text()).slice(0, 140)}`)
  return res
}

// Folder ids are cached so a photo upload isn't three round trips every time.
const folderCache = (): Record<string, string> => {
  try { return JSON.parse(localStorage.getItem(FOLDERS_KEY) ?? '{}') } catch { return {} }
}
const rememberFolder = (key: string, id: string) => {
  const all = folderCache()
  all[key] = id
  localStorage.setItem(FOLDERS_KEY, JSON.stringify(all))
}

async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
  const key = `${parentId ?? 'root'}/${name}`
  const cached = folderCache()[key]
  if (cached) return cached

  const q = [
    `name = '${name.replace(/'/g, "\\'")}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    'trashed = false',
    parentId ? `'${parentId}' in parents` : "'root' in parents",
  ].join(' and ')

  const found = await api(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`,
  ).then((r) => r.json() as Promise<{ files?: { id: string }[] }>)

  if (found.files?.length) {
    rememberFolder(key, found.files[0].id)
    return found.files[0].id
  }

  const created = await api('https://www.googleapis.com/drive/v3/files?fields=id', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      ...(parentId ? { parents: [parentId] } : {}),
    }),
  }).then((r) => r.json() as Promise<{ id: string }>)

  rememberFolder(key, created.id)
  return created.id
}

/** "Rock Solid / 303 W 116th St" — created on first use, reused after. */
export async function folderForBuilding(address: string): Promise<string> {
  const root = await findOrCreateFolder(ROOT_FOLDER)
  // Drive is happy with slashes in names but they read badly; keep it tidy.
  return findOrCreateFolder(address.replace(/\//g, '-').trim() || 'Unfiled', root)
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',')
  const mime = /:(.*?);/.exec(head)?.[1] ?? 'image/jpeg'
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export interface UploadResult { id: string; link: string }

/** Put one photo in a building's folder. Returns the Drive file id. */
export async function uploadPhoto(
  dataUrl: string, buildingAddress: string, filename: string,
): Promise<UploadResult> {
  const folderId = await folderForBuilding(buildingAddress)
  const form = new FormData()
  form.append('metadata', new Blob(
    [JSON.stringify({ name: filename, parents: [folderId] })],
    { type: 'application/json' },
  ))
  form.append('file', dataUrlToBlob(dataUrl))

  const file = await api(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    { method: 'POST', body: form },
  ).then((r) => r.json() as Promise<{ id: string; webViewLink?: string }>)

  return { id: file.id, link: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view` }
}
