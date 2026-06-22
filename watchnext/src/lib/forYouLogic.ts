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
// confirmed like). A personal 1–5 rating then CENTERS that weight around ★3
// (and unrated) = neutral. It's ASYMMETRIC: dislikes bite harder than likes
// reward, because a low score is rarer and more informative ("really not for
// me") than yet another generous 4. ★5 → ×1.30, ★4 → ×1.15, ★3 → ×1.0,
// ★2 → ×0.70, ★1 → ×0.40.
export function seedWeight(entry: WatchlistEntry): number {
  const base = entry.status === "watched" ? 1.2 : entry.status === "watching" ? 0.9 : 0.6;
  const r = entry.rating;
  const factor = r == null ? 1 : r >= 3 ? 1 + (r - 3) * 0.15 : 1 + (r - 3) * 0.3;
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

