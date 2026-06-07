import type { MediaType, Title } from "../types/tmdb";
import type { WatchlistEntry } from "../types/db";

export function titleKey(t: { mediaType: string; tmdbId: number }): string {
  return `${t.mediaType}:${t.tmdbId}`;
}

// Choose which titles to seed recommendations from: the user's top-rated
// watched titles of the given media type (up to `max`), ranked by rating then
// recency. Only rated titles count — unrated watches are ignored so picks
// reflect what the user actually liked, not everything they logged.
export function selectSeeds(entries: WatchlistEntry[], mediaType: MediaType, max: number): WatchlistEntry[] {
  return entries
    .filter((entry) => entry.status === "watched" && entry.media_type === mediaType && entry.rating != null)
    .sort((a, b) => {
      const ra = a.rating ?? -1;
      const rb = b.rating ?? -1;
      if (rb !== ra) return rb - ra;
      return b.added_at.localeCompare(a.added_at);
    })
    .slice(0, max);
}

// Aggregates TMDB recommendation lists (one per watched "seed" title) into a
// single ranked feed. A candidate's score is how many distinct seeds surfaced
// it; titles already in the library are excluded. Ties break by rating then title.
export function rankRecommendations(candidateLists: Title[][], excludeKeys: Set<string>): Title[] {
  const byKey = new Map<string, { title: Title; score: number }>();

  for (const list of candidateLists) {
    const seenThisSeed = new Set<string>();
    for (const cand of list) {
      const key = titleKey(cand);
      if (excludeKeys.has(key)) continue;
      if (seenThisSeed.has(key)) continue;
      seenThisSeed.add(key);
      const existing = byKey.get(key);
      if (existing) existing.score += 1;
      else byKey.set(key, { title: cand, score: 1 });
    }
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
