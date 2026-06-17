import { selectFavorites, topDecade, topGenre } from "../src/lib/profileInsights";
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

describe("topDecade", () => {
  it("picks the most-watched decade from years", () => {
    const lib = [e({ year: "2011" }), e({ year: "2014" }), e({ year: "1999" })];
    expect(topDecade(lib)).toBe("2010s");
  });

  it("only counts watched titles", () => {
    const lib = [e({ year: "1995", status: "want" }), e({ year: "2012", status: "watched" })];
    expect(topDecade(lib)).toBe("2010s");
  });

  it("is null with no usable years", () => {
    expect(topDecade([e({ year: null })])).toBeNull();
  });
});

describe("topGenre", () => {
  it("returns the most common genre across titles", () => {
    expect(topGenre([["Drama", "Crime"], ["Drama"], ["Comedy"]])).toBe("Drama");
  });

  it("breaks ties by first seen", () => {
    expect(topGenre([["Action"], ["Comedy"]])).toBe("Action");
  });

  it("is null for no genres", () => {
    expect(topGenre([])).toBeNull();
    expect(topGenre([[], []])).toBeNull();
  });
});
