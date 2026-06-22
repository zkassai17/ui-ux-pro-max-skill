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
// confirmed like). A personal 1–5 rating then CENTERS that weight: ★3 (and
// unrated) is neutral, ★4–5 amplify the title's pull, ★1–2 shrink it — so a
// disliked title steers recommendations AWAY from its genres instead of still
// boosting them. The factor stays positive (★1 → 0.6×, ★5 → 1.4×).
export function seedWeight(entry: WatchlistEntry): number {
  const base = entry.status === "watched" ? 1.2 : entry.status === "watching" ? 0.9 : 0.6;
  const factor = entry.rating != null ? 1 + (entry.rating - 3) * 0.2 : 1;
  return base * factor;
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

