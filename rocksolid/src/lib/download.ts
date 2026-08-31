/**
 * Handing the viewer a file works two different ways depending on where the app
 * is running. In a normal browser (dev server, or the built dist/ opened
 * locally) an anchor with `download` is all it takes. Inside the claude.ai
 * artifact viewer that anchor is inert, and the page has to go through the
 * `downloads` capability, which shows the viewer a confirmation first.
 */

type Saver = { save(req: { filename: string; data: string }): Promise<unknown> }
type ClaudeGlobal = { use?: (name: string) => Promise<unknown> }

export type SaveOutcome = 'saved' | 'declined' | 'failed'

export async function offerFile(filename: string, text: string): Promise<SaveOutcome> {
  const claude = (window as unknown as { claude?: ClaudeGlobal }).claude

  if (typeof claude?.use === 'function') {
    try {
      const downloads = (await claude.use('downloads')) as Saver | null
      if (downloads) {
        await downloads.save({ filename, data: text })
        return 'saved'
      }
    } catch (err) {
      // The viewer declining is a normal outcome, not an error worth shouting about.
      const code = (err as { code?: string } | null)?.code
      return code === 'declined' ? 'declined' : 'failed'
    }
  }

  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return 'saved'
  } catch {
    return 'failed'
  }
}
