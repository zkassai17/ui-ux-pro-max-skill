import type { WatchlistEntry } from "../types/db";

// Titles every participant has with status "want", matched on tmdb_id+media_type.
// A title is dropped if any participant has it with a different status. Sorted by
// the newest added_at across participants (freshest mutual interest first).
export function sharedWantToWatch(libraries: WatchlistEntry[][]): WatchlistEntry[] {
  if (libraries.length === 0) return [];
  const maps = libraries.map((lib) => {
    const m = new Map<string, WatchlistEntry>();
    for (const e of lib) m.set(`${e.media_type}:${e.tmdb_id}`, e);
    return m;
  });
  const [first, ...rest] = maps;
  const picked: { entry: WatchlistEntry; maxAdded: string }[] = [];
  for (const [key, entry] of Array.from(first.entries())) {
    if (entry.status !== "want") continue;
    let ok = true;
    let maxAdded = entry.added_at;
    for (const m of rest) {
      const e = m.get(key);
      if (!e || e.status !== "want") {
        ok = false;
        break;
      }
      if (e.added_at > maxAdded) maxAdded = e.added_at;
    }
    if (ok) picked.push({ entry, maxAdded });
  }
  return picked.sort((a, b) => b.maxAdded.localeCompare(a.maxAdded)).map((p) => p.entry);
}
