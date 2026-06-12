import type { MediaType, Title } from "../types/tmdb";
import type { WatchlistEntry } from "../types/db";

export function titleKey(t: { mediaType: string; tmdbId: number }): string {
  return `${t.mediaType}:${t.tmdbId}`;
}

export interface WeightedSeed {
  entry: WatchlistEntry;
  weight: number;
}

// How strongly one library entry shapes recommendations. Watched is the
// strongest taste signal, then Watching, then Want (an aspiration, not a
// confirmed like). A personal 1–5 rating nudges it further so a loved title
// pulls harder than an unrated one.
export function seedWeight(entry: WatchlistEntry): number {
  const base = entry.status === "watched" ? 1.2 : entry.status === "watching" ? 0.9 : 0.6;
  const ratingBoost = entry.rating != null ? entry.rating * 0.1 : 0;
  return base + ratingBoost;
}

// Pick the library titles of a media type to seed from, each tagged with its
// weight, strongest first, capped at `max`. Unlike watched-only seeding, EVERY
// status counts (Want/Watching/Watched) so the rail works before you've
// finished anything. added_at breaks ties (newer first).
export function selectWeightedSeeds(
  entries: WatchlistEntry[],
  mediaType: MediaType,
  max: number,
): WeightedSeed[] {
  return entries
    .filter((e) => e.media_type === mediaType)
    .map((entry) => ({ entry, weight: seedWeight(entry) }))
    .sort((a, b) => b.weight - a.weight || b.entry.added_at.localeCompare(a.entry.added_at))
    .slice(0, max);
}

export interface WeightedList {
  weight: number;
  titles: Title[];
}

// Build the ranked "for you" feed. Each seed's TMDB "more like this" list votes
// for its candidates, weighted by how much we trust that seed. Trending titles
// get a small additive boost AND seed the pool themselves — so the rail is
// never empty (a brand-new user still sees trending) and a trending pick edges
// out an equally-recommended non-trending one. Library titles (excludeKeys) are
// removed. Ties break by TMDB rating then title.
export function rankForYou(
  seedLists: WeightedList[],
  trending: Title[],
  trendingWeight: number,
  excludeKeys: Set<string>,
): Title[] {
  const byKey = new Map<string, { title: Title; score: number }>();

  const bump = (cand: Title, amount: number) => {
    const key = titleKey(cand);
    if (excludeKeys.has(key)) return;
    const existing = byKey.get(key);
    if (existing) existing.score += amount;
    else byKey.set(key, { title: cand, score: amount });
  };

  for (const { weight, titles } of seedLists) {
    const seenThisSeed = new Set<string>();
    for (const cand of titles) {
      const key = titleKey(cand);
      if (seenThisSeed.has(key)) continue; // one vote per seed
      seenThisSeed.add(key);
      bump(cand, weight);
    }
  }

  const seenTrending = new Set<string>();
  for (const cand of trending) {
    const key = titleKey(cand);
    if (seenTrending.has(key)) continue;
    seenTrending.add(key);
    bump(cand, trendingWeight);
  }

  return [...byKey.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ra = a.title.rating ?? -1;
      const rb = b.title.rating ?? -1;
      if (rb !== ra) return rb - ra;
      return a.title.title.localeCompare(b.title.title);
    })
    .map((e) => e.title);
}
