import { rankRecommendations, selectSeeds, titleKey } from "../src/lib/forYouLogic";
import type { Title } from "../src/types/tmdb";
import type { WatchlistEntry } from "../src/types/db";

function t(over: Partial<Title>): Title {
  return { tmdbId: 1, mediaType: "movie", title: "X", year: null, posterPath: null, rating: null, ...over };
}

function e(over: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: "id",
    user_id: "u",
    tmdb_id: 1,
    media_type: "movie",
    title: "X",
    poster_path: null,
    status: "watched",
    rating: null,
    added_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

test("frequency across seed lists drives ranking", () => {
  const a = t({ tmdbId: 1, title: "A" });
  const b = t({ tmdbId: 2, title: "B" });
  // B appears twice, A once
  const ranked = rankRecommendations([[a, b], [b]], new Set());
  expect(ranked.map((x) => x.tmdbId)).toEqual([2, 1]);
});

test("excludes titles already in library", () => {
  const a = t({ tmdbId: 1, title: "A" });
  const b = t({ tmdbId: 2, title: "B" });
  const ranked = rankRecommendations([[a, b]], new Set([titleKey(a)]));
  expect(ranked.map((x) => x.tmdbId)).toEqual([2]);
});

test("ties broken by rating descending then title", () => {
  const a = t({ tmdbId: 1, title: "Zebra", rating: 8 });
  const b = t({ tmdbId: 2, title: "Apple", rating: 9 });
  const c = t({ tmdbId: 3, title: "Mango", rating: 9 });
  const ranked = rankRecommendations([[a, b, c]], new Set());
  // b and c both rating 9 -> alphabetical Apple before Mango; a rating 8 last
  expect(ranked.map((x) => x.tmdbId)).toEqual([2, 3, 1]);
});

test("same tmdb id but different media type are distinct", () => {
  const movie = t({ tmdbId: 1, mediaType: "movie", title: "M" });
  const show = t({ tmdbId: 1, mediaType: "tv", title: "S" });
  const ranked = rankRecommendations([[movie, show]], new Set());
  expect(ranked).toHaveLength(2);
});

test("deduplicates within a single seed list (one vote per seed)", () => {
  const a = t({ tmdbId: 1, title: "A" });
  const b = t({ tmdbId: 2, title: "B" });
  // A listed twice in the same seed list counts once; tie broken by title
  const ranked = rankRecommendations([[a, a, b]], new Set());
  expect(ranked.map((x) => x.tmdbId)).toEqual([1, 2]);
});

test("selectSeeds keeps watched entries of the media type, rated first then unrated", () => {
  const entries = [
    e({ tmdb_id: 1, media_type: "movie", status: "watched", rating: 4 }),
    e({ tmdb_id: 2, media_type: "movie", status: "want", rating: 5 }),
    e({ tmdb_id: 3, media_type: "tv", status: "watched", rating: 5 }),
    e({ tmdb_id: 4, media_type: "movie", status: "watching", rating: 5 }),
    e({ tmdb_id: 5, media_type: "movie", status: "watched", rating: null }),
  ];
  const seeds = selectSeeds(entries, "movie", 20);
  // watched movies only: rated #1 before unrated #5; want/watching/tv excluded
  expect(seeds.map((s) => s.tmdb_id)).toEqual([1, 5]);
});

test("selectSeeds prioritizes higher ratings, with unrated titles last", () => {
  const entries = [
    e({ tmdb_id: 1, rating: 3, added_at: "2026-05-01T00:00:00Z" }),
    e({ tmdb_id: 2, rating: 5, added_at: "2026-01-01T00:00:00Z" }),
    e({ tmdb_id: 3, rating: 5, added_at: "2026-02-01T00:00:00Z" }),
    e({ tmdb_id: 4, rating: null, added_at: "2026-06-01T00:00:00Z" }),
  ];
  const seeds = selectSeeds(entries, "movie", 20);
  // rating 5 (tiebreak newer first): 3, 2; then rating 3: 1; then unrated: 4
  expect(seeds.map((s) => s.tmdb_id)).toEqual([3, 2, 1, 4]);
});

test("selectSeeds caps the count, always keeping rated favorites first", () => {
  const entries = [
    e({ tmdb_id: 1, rating: 5 }),
    ...Array.from({ length: 50 }, (_, i) => e({ tmdb_id: i + 100, rating: null })),
  ];
  const seeds = selectSeeds(entries, "movie", 20);
  expect(seeds).toHaveLength(20);
  expect(seeds[0].tmdb_id).toBe(1);
});
