import type { WatchlistEntry } from "../types/db";

// Your top-rated watched titles (with posters), best first — for the profile
// Favorites strip. Ties break by most-recently added.
export function selectFavorites(library: WatchlistEntry[], max: number): WatchlistEntry[] {
  return library
    .filter((e) => e.status === "watched" && e.rating != null && e.poster_path)
    .sort((a, b) => (b.rating! - a.rating!) || b.added_at.localeCompare(a.added_at))
    .slice(0, max);
}

export interface ProfileInsights {
  thisYear: number; // titles logged this calendar year
  avgRating: number | null; // average personal rating (1 decimal), or null if none rated
  topDecade: string | null; // most-watched decade, e.g. "2010s"
}

// Lightweight, fetch-free insights computed straight from the library.
export function computeProfileInsights(library: WatchlistEntry[], currentYear: number): ProfileInsights {
  const thisYear = library.filter((e) => e.added_at.slice(0, 4) === String(currentYear)).length;

  const rated = library.filter((e) => e.rating != null);
  const avgRating = rated.length
    ? Math.round((rated.reduce((s, e) => s + (e.rating as number), 0) / rated.length) * 10) / 10
    : null;

  const decades = new Map<string, number>();
  for (const e of library) {
    if (e.status !== "watched" || !e.year) continue;
    const y = parseInt(e.year, 10);
    if (Number.isNaN(y)) continue;
    const dec = `${Math.floor(y / 10) * 10}s`;
    decades.set(dec, (decades.get(dec) ?? 0) + 1);
  }
  let topDecade: string | null = null;
  let top = 0;
  for (const [d, n] of decades) {
    if (n > top) {
      top = n;
      topDecade = d;
    }
  }

  return { thisYear, avgRating, topDecade };
}
