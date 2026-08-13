import type { WatchlistEntry } from "../types/db";
import type { Suggestion } from "../types/tmdb";
import { titleKey } from "./forYouLogic";

export type GroupPick = {
  // A representative "want" entry for the title (newest, so the freshest
  // poster/title wins).
  entry: WatchlistEntry;
  // How many participants want it (1 = one person's pick, 2+ = mutual interest).
  wantedBy: number;
};

// Titles at least one participant WANTS that NOBODY in the group has already
// watched — "one of us is excited, and nobody's seen it yet." This is the
// realistic version of "what should we watch": it doesn't require everyone to
// independently have the same title on their want-list (which almost never
// happens), it just needs one spark plus no spoiler. Matched on
// tmdb_id+media_type. Ranked by how many people want it (mutual interest
// first), then by the freshest "want". Pure: order-independent, no side effects.
export function groupPicks(libraries: WatchlistEntry[][]): GroupPick[] {
  if (libraries.length === 0) return [];

  // Bucket every participant's entry for a title together.
  const byKey = new Map<string, WatchlistEntry[]>();
  for (const lib of libraries) {
    for (const e of lib) {
      const k = `${e.media_type}:${e.tmdb_id}`;
      const arr = byKey.get(k);
      if (arr) arr.push(e);
      else byKey.set(k, [e]);
    }
  }

  const picks: { entry: WatchlistEntry; wantedBy: number; freshest: string }[] = [];
  for (const entries of byKey.values()) {
    if (entries.some((e) => e.status === "watched")) continue; // someone's seen it
    const wants = entries.filter((e) => e.status === "want");
    if (wants.length === 0) continue; // nobody actually wants it
    const rep = wants.reduce((a, b) => (b.added_at > a.added_at ? b : a));
    picks.push({ entry: rep, wantedBy: wants.length, freshest: rep.added_at });
  }

  return picks
    .sort((a, b) => b.wantedBy - a.wantedBy || b.freshest.localeCompare(a.freshest))
    .map((p) => ({ entry: p.entry, wantedBy: p.wantedBy }));
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
