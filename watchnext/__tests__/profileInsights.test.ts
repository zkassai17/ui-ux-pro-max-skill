import { selectFavorites, computeProfileInsights } from "../src/lib/profileInsights";
import type { WatchlistEntry } from "../src/types/db";

function e(over: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: Math.random().toString(),
    user_id: "u",
    tmdb_id: 1,
    media_type: "movie",
    title: "X",
    poster_path: "/p.jpg",
    year: "2015",
    status: "watched",
    rating: null,
    added_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("selectFavorites", () => {
  it("returns watched + rated + poster titles, best rating first", () => {
    const lib = [
      e({ tmdb_id: 1, rating: 3 }),
      e({ tmdb_id: 2, rating: 5 }),
      e({ tmdb_id: 3, rating: 4 }),
    ];
    expect(selectFavorites(lib, 10).map((x) => x.tmdb_id)).toEqual([2, 3, 1]);
  });

  it("excludes unrated, unwatched, and poster-less titles", () => {
    const lib = [
      e({ tmdb_id: 1, rating: null }), // unrated
      e({ tmdb_id: 2, rating: 5, status: "want" }), // not watched
      e({ tmdb_id: 3, rating: 5, poster_path: null }), // no poster
      e({ tmdb_id: 4, rating: 5 }), // keeper
    ];
    expect(selectFavorites(lib, 10).map((x) => x.tmdb_id)).toEqual([4]);
  });

  it("caps the count", () => {
    const lib = Array.from({ length: 20 }, (_, i) => e({ tmdb_id: i, rating: 5 }));
    expect(selectFavorites(lib, 8)).toHaveLength(8);
  });
});

describe("computeProfileInsights", () => {
  it("counts titles logged this year", () => {
    const lib = [
      e({ added_at: "2026-03-01T00:00:00Z" }),
      e({ added_at: "2026-09-01T00:00:00Z" }),
      e({ added_at: "2025-01-01T00:00:00Z" }),
    ];
    expect(computeProfileInsights(lib, 2026).thisYear).toBe(2);
  });

  it("averages personal ratings to one decimal", () => {
    const lib = [e({ rating: 5 }), e({ rating: 4 }), e({ rating: 4 })];
    expect(computeProfileInsights(lib, 2026).avgRating).toBeCloseTo(4.3, 5);
  });

  it("avgRating is null when nothing is rated", () => {
    expect(computeProfileInsights([e({ rating: null })], 2026).avgRating).toBeNull();
  });

  it("picks the most-watched decade from years", () => {
    const lib = [
      e({ year: "2011" }),
      e({ year: "2014" }),
      e({ year: "1999" }),
    ];
    expect(computeProfileInsights(lib, 2026).topDecade).toBe("2010s");
  });

  it("topDecade is null with no usable years", () => {
    expect(computeProfileInsights([e({ year: null })], 2026).topDecade).toBeNull();
  });
});
