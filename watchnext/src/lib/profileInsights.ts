import type { WatchlistEntry } from "../types/db";

// Your top-rated watched titles (with posters), best first — for the profile
// Favorites strip. Ties break by most-recently added.
export function selectFavorites(library: WatchlistEntry[], max: number): WatchlistEntry[] {
  return library
    .filter((e) => e.status === "watched" && e.rating != null && e.poster_path)
    .sort((a, b) => (b.rating! - a.rating!) || b.added_at.localeCompare(a.added_at))
    .slice(0, max);
}

// Generic "most common, ties → first seen" tally.
function mostCommon<T>(items: T[]): T | null {
  const counts = new Map<T, number>();
  const order: T[] = [];
  for (const it of items) {
    if (!counts.has(it)) order.push(it);
    counts.set(it, (counts.get(it) ?? 0) + 1);
  }
  let best: T | null = null;
  let top = 0;
  for (const it of order) {
    const n = counts.get(it)!;
    if (n > top) {
      top = n;
      best = it;
    }
  }
  return best;
}

// The decade the user watches most (e.g. "2010s"), from watched titles' years.
export function topDecade(library: WatchlistEntry[]): string | null {
  const decades: string[] = [];
  for (const e of library) {
    if (e.status !== "watched" || !e.year) continue;
    const y = parseInt(e.year, 10);
    if (Number.isNaN(y)) continue;
    decades.push(`${Math.floor(y / 10) * 10}s`);
  }
  return mostCommon(decades);
}

// The most common genre across a set of titles' genre lists (genre names).
export function topGenre(genreLists: string[][]): string | null {
  return mostCommon(genreLists.flat());
}
