import type { WatchlistEntry } from "../types/db";
import type { Suggestion } from "../types/tmdb";
import { titleKey } from "./forYouLogic";

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

// Aggregates per-person TMDB recommendation lists into one ranked list. A
// candidate's score is the number of distinct people whose list surfaced it
// (each person votes at most once per title). Titles in excludeKeys (anything
// any participant already has) are removed. Ties break by rating then title.
// Returns the top 20.
export function rankSuggestions(
  candidatesByPerson: Suggestion[][],
  excludeKeys: Set<string>
): Suggestion[] {
  const byKey = new Map<string, { item: Suggestion; score: number }>();
  for (const list of candidatesByPerson) {
    const seenThisPerson = new Set<string>();
    for (const cand of list) {
      const key = titleKey(cand);
      if (excludeKeys.has(key)) continue;
      if (seenThisPerson.has(key)) continue;
      seenThisPerson.add(key);
      const existing = byKey.get(key);
      if (existing) existing.score += 1;
      else byKey.set(key, { item: cand, score: 1 });
    }
  }
  return [...byKey.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ra = a.item.rating ?? -1;
      const rb = b.item.rating ?? -1;
      if (rb !== ra) return rb - ra;
      return a.item.title.localeCompare(b.item.title);
    })
    .map((e) => e.item)
    .slice(0, 20);
}

// Keeps suggestions whose genreIds intersect the selected set. Empty selection
// is a no-op (returns the same reference, so callers can cheaply skip work).
export function filterByGenre(suggestions: Suggestion[], genreIds: number[]): Suggestion[] {
  if (genreIds.length === 0) return suggestions;
  const set = new Set(genreIds);
  return suggestions.filter((s) => s.genreIds.some((g) => set.has(g)));
}

// Safe indexed pick used by the Shuffle button; wraps the index and returns null
// for an empty list.
export function pickHero<T>(list: T[], index: number): T | null {
  if (list.length === 0) return null;
  const i = ((index % list.length) + list.length) % list.length;
  return list[i];
}
