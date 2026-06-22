import type { Title } from "../types/tmdb";
import type { WatchlistEntry } from "../types/db";
import { titleKey, seedWeight } from "./forYouLogic";

// Our own recommendation engine — replaces TMDB's "more like this" with a hybrid
// of content similarity (genre taste) + collaborative signal (friends like you) +
// a small trending nudge. All pure: the caller supplies the fetched data.

// A candidate we can content-score: a Title plus its TMDB genre ids.
export interface GenreTitle extends Title {
  genreIds: number[];
}

// Build a genre-preference profile from the library. Each entry adds its seed
// weight (status + personal rating, via seedWeight) to every genre it belongs
// to, so the genres behind your most-loved titles dominate. `genresByKey` maps a
// titleKey to that title's genre ids (caller fetches these).
export function buildGenreProfile(
  library: WatchlistEntry[],
  genresByKey: Map<string, number[]>,
): Map<number, number> {
  const profile = new Map<number, number>();
  for (const entry of library) {
    const key = titleKey({ mediaType: entry.media_type, tmdbId: entry.tmdb_id });
    const genres = genresByKey.get(key);
    if (!genres) continue;
    const w = seedWeight(entry);
    for (const g of genres) profile.set(g, (profile.get(g) ?? 0) + w);
  }
  return profile;
}

// How well a candidate's genres match your taste, normalized to 0..1 by the
// profile's total weight so scores are comparable. A title sharing your heaviest
// genres scores near 1; one sharing none scores 0.
export function contentScore(genreIds: number[], profile: Map<number, number>): number {
  let total = 0;
  for (const w of profile.values()) total += w;
  if (total === 0) return 0;
  let hit = 0;
  const counted = new Set<number>();
  for (const g of genreIds) {
    if (counted.has(g)) continue;
    counted.add(g);
    hit += profile.get(g) ?? 0;
  }
  return hit / total;
}

// Negative-signal penalty from titles the user marked "Not interested". `dislike`
// maps a genre id to how many dismissed titles had it. The penalty grows each time
// you reject the same genre (so the feed keeps learning), but a one-off rejection
// barely dents — and it's capped so it can never fully zero out a good match.
export function dislikePenalty(genreIds: number[], dislike: Map<number, number>): number {
  if (dislike.size === 0) return 0;
  let p = 0;
  const counted = new Set<number>();
  for (const g of genreIds) {
    if (counted.has(g)) continue;
    counted.add(g);
    p += Math.min(dislike.get(g) ?? 0, 5) * 0.06; // each repeated rejection adds up, capped at 5
  }
  return Math.min(p, 0.5);
}

// A taste-neighbor: someone whose taste overlaps yours, with a 0..1 affinity
// (taste-match% / 100) and the set of titleKeys they like.
export interface Neighbor {
  affinity: number;
  likedKeys: Set<string>;
}

// Collaborative signal for a candidate: summed affinity of neighbors who like
// it. Closer/more neighbors liking it → higher score.
export function collaborativeScore(key: string, neighbors: Neighbor[]): number {
  let s = 0;
  for (const n of neighbors) if (n.likedKeys.has(key)) s += n.affinity;
  return s;
}

// Cold-start ramp for the collaborative weight: 0 with no neighbors, rising
// toward `max` as usable neighbors accumulate — so sparse social data (you + one
// friend) barely nudges, while a rich graph leans in hard.
export function collaborativeWeight(neighborCount: number, max: number): number {
  if (neighborCount <= 0) return 0;
  return max * (neighborCount / (neighborCount + 3));
}

// The languages a user actually watches, learned from the original languages of
// titles in their library. Drives the "match my languages" candidate filter.
export function learnLanguages(langs: (string | null | undefined)[]): Set<string> {
  const s = new Set<string>();
  for (const l of langs) if (l) s.add(l);
  return s;
}

// The single most common language (for a server-side discover filter). null if unknown.
export function dominantLanguage(langs: (string | null | undefined)[]): string | null {
  const counts = new Map<string, number>();
  for (const l of langs) if (l) counts.set(l, (counts.get(l) ?? 0) + 1);
  let best: string | null = null;
  let bestN = 0;
  for (const [l, n] of counts) if (n > bestN) ((best = l), (bestN = n));
  return best;
}

// Keep only candidates in a language the user watches. If we couldn't learn any
// languages (empty library / cold start) we don't filter. Candidates with
// unknown language are kept (better to allow than wrongly drop).
export function filterByLanguage<T extends { originalLanguage?: string | null }>(
  items: T[],
  allowed: Set<string>,
): T[] {
  if (allowed.size === 0) return items;
  return items.filter((i) => !i.originalLanguage || allowed.has(i.originalLanguage));
}

export interface HybridWeights {
  content: number;
  collaborative: number;
  trending: number;
}

// Blend content + collaborative + trending into one ranked feed. Candidates the
// user already has (excludeKeys) and anything nothing recommends (score 0) are
// dropped. Ties break by TMDB rating then title.
export function rankHybrid(params: {
  candidates: GenreTitle[];
  profile: Map<number, number>;
  neighbors: Neighbor[];
  trendingKeys: Set<string>;
  weights: HybridWeights;
  excludeKeys: Set<string>;
  // Genres the user keeps marking "Not interested" — subtracted from the score.
  dislike?: Map<number, number>;
}): Title[] {
  const { candidates, profile, neighbors, trendingKeys, weights, excludeKeys, dislike } = params;
  const seen = new Set<string>();
  const scored: { title: Title; score: number }[] = [];

  for (const c of candidates) {
    const key = titleKey(c);
    if (excludeKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    const score =
      weights.content * contentScore(c.genreIds, profile) +
      weights.collaborative * collaborativeScore(key, neighbors) +
      weights.trending * (trendingKeys.has(key) ? 1 : 0) -
      (dislike ? dislikePenalty(c.genreIds, dislike) : 0);
    if (score <= 0) continue;
    scored.push({ title: c, score });
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ra = a.title.rating ?? -1;
      const rb = b.title.rating ?? -1;
      if (rb !== ra) return rb - ra;
      return a.title.title.localeCompare(b.title.title);
    })
    .map((e) => e.title);
}
