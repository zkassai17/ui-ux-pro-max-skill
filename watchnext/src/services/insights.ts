import { getTitleDetails } from "./tmdb";
import type { WatchlistEntry } from "../types/db";
import {
  genreBreakdown,
  decadeBreakdown,
  ratingBreakdown,
  watchedTotals,
  yearInReview,
} from "../lib/profileInsights";

// Genres aren't stored per title, so we pull them from TMDB per watched title.
// GENRE_SAMPLE bounds the worst case (a huge library) so we never fan out
// unboundedly; GENRE_CONCURRENCY caps how many run at once so we don't burst
// TMDB. For a typical library this now covers *every* watched title.
const GENRE_SAMPLE = 400;
const GENRE_CONCURRENCY = 12;

async function genreListsFor(entries: WatchlistEntry[]): Promise<string[][]> {
  const out: string[][] = new Array(entries.length);
  let cursor = 0;
  async function worker() {
    while (cursor < entries.length) {
      const idx = cursor++;
      const e = entries[idx];
      out[idx] = await getTitleDetails(e.media_type, e.tmdb_id)
        .then((d) => d.genres)
        .catch(() => [] as string[]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(GENRE_CONCURRENCY, entries.length) }, worker),
  );
  return out;
}

export type Insights = {
  totals: { movies: number; tv: number; total: number };
  genres: { name: string; count: number }[];
  decades: { decade: string; count: number }[];
  ratings: { rating: number; count: number }[];
};

// Full taste breakdown for the Pro Insights screen.
export async function getInsights(library: WatchlistEntry[]): Promise<Insights> {
  const watched = library.filter((e) => e.status === "watched").slice(0, GENRE_SAMPLE);
  const lists = await genreListsFor(watched);
  return {
    totals: watchedTotals(library),
    genres: genreBreakdown(lists, 6),
    decades: decadeBreakdown(library).slice(0, 6),
    ratings: ratingBreakdown(library),
  };
}

export type YearRecap = {
  year: number;
  count: number;
  movies: number;
  tv: number;
  topGenre: string | null;
  top: WatchlistEntry | null;
};

// "Year in Watch" recap for a calendar year (by when titles were logged).
export async function getYearInReview(library: WatchlistEntry[], year: number): Promise<YearRecap> {
  const base = yearInReview(library, year);
  const yearWatched = library
    .filter((e) => e.status === "watched" && e.added_at.slice(0, 4) === String(year))
    .slice(0, GENRE_SAMPLE);
  const lists = await genreListsFor(yearWatched);
  const gb = genreBreakdown(lists, 1);
  return {
    year,
    count: base.count,
    movies: base.movies,
    tv: base.tv,
    top: base.top,
    topGenre: gb[0]?.name ?? null,
  };
}
