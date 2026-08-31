/**
 * Browsers treat ordinary site data as disposable and evict it under storage
 * pressure — on iOS, site data can be cleared after roughly a week of not
 * opening the site. For a notebook holding dated photo evidence that is a real
 * way to lose months of work, so ask to be exempt.
 *
 * The request is granted silently or not at all; there's no prompt to handle.
 * Installing to the home screen makes a grant much more likely.
 */
export async function requestDurableStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export interface StorageStatus {
  durable: boolean
  usedMB: number
  quotaMB: number
  supported: boolean
}

export async function storageStatus(): Promise<StorageStatus> {
  try {
    if (!navigator.storage?.estimate) {
      return { durable: false, usedMB: 0, quotaMB: 0, supported: false }
    }
    const est = await navigator.storage.estimate()
    return {
      durable: navigator.storage.persisted ? await navigator.storage.persisted() : false,
      usedMB: +(((est.usage ?? 0) / 1048576).toFixed(1)),
      quotaMB: Math.round((est.quota ?? 0) / 1048576),
      supported: true,
    }
  } catch {
    return { durable: false, usedMB: 0, quotaMB: 0, supported: false }
  }
}
