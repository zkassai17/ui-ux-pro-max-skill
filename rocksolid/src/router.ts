import { useSyncExternalStore } from 'react'

/**
 * Hash routing, deliberately dependency-free: it keeps the back button working
 * and still resolves when the built app is opened straight from the filesystem.
 */

function currentHash() {
  return window.location.hash.replace(/^#/, '') || '/today'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, currentHash, () => '/today')
  return hash.split('/').filter(Boolean)
}

export function navigate(path: string) {
  window.location.hash = path
  // Deep-linking into a detail view should start at the top, not wherever the
  // previous list happened to be scrolled to.
  window.scrollTo({ top: 0 })
}
