import type { WatchlistEntry } from "../types/db";

// For the profile Favorites strip. Prefers the titles you've explicitly hearted
// (newest first). If you haven't hearted anything yet, falls back to your
// top-rated watched titles so the strip is never empty. Ties break by recency.
export function selectFavorites(library: WatchlistEntry[], max: number): WatchlistEntry[] {
  const hearted = library
    .filter((e) => e.is_favorite && e.poster_path)
    .sort((a, b) => b.added_at.localeCompare(a.added_at));
  if (hearted.length > 0) return hearted.slice(0, max);

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

// --- Full breakdowns (Pro insights) ---

// Full frequency table (most first). Ties keep first-seen order.
function tally<T>(items: T[]): { value: T; count: number }[] {
  const counts = new Map<T, number>();
  const order: T[] = [];
  for (const it of items) {
    if (!counts.has(it)) order.push(it);
    counts.set(it, (counts.get(it) ?? 0) + 1);
  }
  return order
    .map((value) => ({ value, count: counts.get(value)! }))
    .sort((a, b) => b.count - a.count);
}

// Ranked genres across titles' genre lists (top `max`).
export function genreBreakdown(genreLists: string[][], max = 6): { name: string; count: number }[] {
  return tally(genreLists.flat())
    .slice(0, max)
    .map((t) => ({ name: t.value, count: t.count }));
}

// Ranked decades from watched titles' years.
export function decadeBreakdown(library: WatchlistEntry[]): { decade: string; count: number }[] {
  const decades: string[] = [];
  for (const e of library) {
    if (e.status !== "watched" || !e.year) continue;
    const y = parseInt(e.year, 10);
    if (Number.isNaN(y)) continue;
    decades.push(`${Math.floor(y / 10) * 10}s`);
  }
  return tally(decades).map((t) => ({ decade: t.value, count: t.count }));
}

// How the user spreads ★1–★5 across their rated watched titles (5 → 1).
export function ratingBreakdown(library: WatchlistEntry[]): { rating: number; count: number }[] {
  const counts = new Map<number, number>();
  for (const e of library) {
    if (e.status === "watched" && e.rating != null && e.rating >= 1 && e.rating <= 5) {
      counts.set(e.rating, (counts.get(e.rating) ?? 0) + 1);
    }
  }
  return [5, 4, 3, 2, 1].map((rating) => ({ rating, count: counts.get(rating) ?? 0 }));
}

// Watched totals by media type.
export function watchedTotals(library: WatchlistEntry[]): { movies: number; tv: number; total: number } {
  let movies = 0;
  let tv = 0;
  for (const e of library) {
    if (e.status !== "watched") continue;
    if (e.media_type === "movie") movies++;
    else if (e.media_type === "tv") tv++;
  }
  return { movies, tv, total: movies + tv };
}

// --- Year in Watch recap ---

// Watched titles logged (added_at) in a given calendar year, with headline stats.
// `top` is that year's highest-rated title (ties → most recently added).
export function yearInReview(
  library: WatchlistEntry[],
  year: number,
): { count: number; movies: number; tv: number; top: WatchlistEntry | null } {
  const inYear = library.filter(
    (e) => e.status === "watched" && e.added_at.slice(0, 4) === String(year),
  );
  const movies = inYear.filter((e) => e.media_type === "movie").length;
  const tv = inYear.filter((e) => e.media_type === "tv").length;
  const top =
    inYear
      .filter((e) => e.rating != null)
      .sort((a, b) => b.rating! - a.rating! || b.added_at.localeCompare(a.added_at))[0] ?? null;
  return { count: inYear.length, movies, tv, top };
}
