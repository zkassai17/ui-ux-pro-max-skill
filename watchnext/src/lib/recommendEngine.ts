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
}): Title[] {
  const { candidates, profile, neighbors, trendingKeys, weights, excludeKeys } = params;
  const seen = new Set<string>();
  const scored: { title: Title; score: number }[] = [];

  for (const c of candidates) {
    const key = titleKey(c);
    if (excludeKeys.has(key) || seen.has(key)) continue;
    seen.add(key);
    const score =
      weights.content * contentScore(c.genreIds, profile) +
      weights.collaborative * collaborativeScore(key, neighbors) +
      weights.trending * (trendingKeys.has(key) ? 1 : 0);
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
