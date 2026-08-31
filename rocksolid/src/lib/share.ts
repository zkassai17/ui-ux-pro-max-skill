/**
 * Getting text out of the app and into a message.
 *
 * On a phone the Web Share API is the right answer — it opens the system sheet
 * so you pick Messages, Mail or WhatsApp and choose the recipient there. Where
 * that is missing we fall back to an `sms:` link, and on a desktop browser with
 * neither we put it on the clipboard so it can be pasted.
 */

export type ShareOutcome = 'shared' | 'messages' | 'copied' | 'cancelled' | 'failed'

function isIOS(): boolean {
  const ua = navigator.userAgent
  // iPadOS reports as a Mac, so touch points are what separates it.
  return /iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

function isPhoneish(): boolean {
  return navigator.maxTouchPoints > 0
}

export async function sendAsText(body: string): Promise<ShareOutcome> {
  const nav = navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }

  if (typeof nav.share === 'function') {
    try {
      await nav.share({ text: body })
      return 'shared'
    } catch (err) {
      // Dismissing the sheet is a decision, not a failure — don't fall through
      // and surprise them by opening Messages anyway.
      if ((err as DOMException | null)?.name === 'AbortError') return 'cancelled'
    }
  }

  if (isPhoneish()) {
    try {
      // iOS wants `sms:&body=`, Android wants `sms:?body=`.
      window.location.href = `sms:${isIOS() ? '&' : '?'}body=${encodeURIComponent(body)}`
      return 'messages'
    } catch {
      /* fall through to the clipboard */
    }
  }

  try {
    await navigator.clipboard.writeText(body)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function outcomeMessage(o: ShareOutcome): string {
  switch (o) {
    case 'shared': return 'Sent to share sheet'
    case 'messages': return 'Opening Messages'
    case 'copied': return 'Copied — paste it into a message'
    case 'cancelled': return 'Cancelled'
    default: return 'Could not share from this browser'
  }
}
