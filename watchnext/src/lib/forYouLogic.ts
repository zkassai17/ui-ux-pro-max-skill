import type { MediaType } from "../types/tmdb";
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

