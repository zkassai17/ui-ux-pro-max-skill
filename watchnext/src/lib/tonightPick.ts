import type { Title } from "../types/tmdb";
import type { WatchlistEntry } from "../types/db";

// "Tonight's pick" prefers something you ALREADY want to watch — a title on your
// Want list — so the hero is distinct from the discovery rails (which surface new
// titles). A stable day number rotates the pick daily; dismissing one (hidden)
// drops it so the next candidate shows. Returns null when nothing qualifies (the
// caller then falls back to a recommendation).

function entryKey(e: { media_type: string; tmdb_id: number }): string {
  return `${e.media_type}:${e.tmdb_id}`;
}

export function entryToTitle(e: WatchlistEntry): Title {
  return {
    tmdbId: e.tmdb_id,
    mediaType: e.media_type,
    title: e.title,
    year: e.year,
    posterPath: e.poster_path,
    rating: e.rating,
  };
}

// Pick one Want-list title for tonight. `hidden` holds titleKey strings the user
// dismissed. `dayNumber` (e.g. Math.floor(Date.now()/86400000)) rotates the pick
// once per day while staying stable within the day.
export function pickTonight(
  entries: WatchlistEntry[],
  hidden: Set<string>,
  dayNumber: number,
): Title | null {
  const wants = entries
    .filter((e) => e.status === "want" && !hidden.has(entryKey(e)))
    // Stable ordering so the daily rotation is deterministic.
    .sort((a, b) => entryKey(a).localeCompare(entryKey(b)));
  if (wants.length === 0) return null;
  const idx = ((dayNumber % wants.length) + wants.length) % wants.length;
  return entryToTitle(wants[idx]);
}
