import {
  selectFavorites,
  topDecade,
  topGenre,
  genreBreakdown,
  decadeBreakdown,
  ratingBreakdown,
  watchedTotals,
  yearInReview,
} from "../src/lib/profileInsights";
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

describe("genreBreakdown", () => {
  it("ranks genres by frequency, capped at max", () => {
    const lists = [["Comedy", "Action"], ["Comedy"], ["Drama"], ["Comedy", "Action"]];
    expect(genreBreakdown(lists, 2)).toEqual([
      { name: "Comedy", count: 3 },
      { name: "Action", count: 2 },
    ]);
  });
  it("is empty for no genres", () => {
    expect(genreBreakdown([])).toEqual([]);
  });
});

describe("decadeBreakdown", () => {
  it("ranks decades from watched years", () => {
    const lib = [
      e({ tmdb_id: 1, year: "2015" }),
      e({ tmdb_id: 2, year: "2011" }),
      e({ tmdb_id: 3, year: "1999" }),
    ];
    expect(decadeBreakdown(lib)).toEqual([
      { decade: "2010s", count: 2 },
      { decade: "1990s", count: 1 },
    ]);
  });
  it("ignores unwatched and yearless titles", () => {
    const lib = [
      e({ tmdb_id: 1, year: "2015", status: "want" }),
      e({ tmdb_id: 2, year: null }),
    ];
    expect(decadeBreakdown(lib)).toEqual([]);
  });
});

describe("ratingBreakdown", () => {
  it("counts each rating 5→1, zero-filled", () => {
    const lib = [
      e({ tmdb_id: 1, rating: 5 }),
      e({ tmdb_id: 2, rating: 5 }),
      e({ tmdb_id: 3, rating: 3 }),
    ];
    expect(ratingBreakdown(lib)).toEqual([
      { rating: 5, count: 2 },
      { rating: 4, count: 0 },
      { rating: 3, count: 1 },
      { rating: 2, count: 0 },
      { rating: 1, count: 0 },
    ]);
  });
});

describe("watchedTotals", () => {
  it("counts watched movies and shows", () => {
    const lib = [
      e({ tmdb_id: 1, media_type: "movie" }),
      e({ tmdb_id: 2, media_type: "tv" }),
      e({ tmdb_id: 3, media_type: "movie", status: "want" }),
    ];
    expect(watchedTotals(lib)).toEqual({ movies: 1, tv: 1, total: 2 });
  });
});

describe("yearInReview", () => {
  it("counts titles logged in the given year with top pick", () => {
    const lib = [
      e({ tmdb_id: 1, added_at: "2026-03-01T00:00:00Z", media_type: "movie", rating: 4 }),
      e({ tmdb_id: 2, added_at: "2026-06-01T00:00:00Z", media_type: "tv", rating: 5 }),
      e({ tmdb_id: 3, added_at: "2025-06-01T00:00:00Z", media_type: "movie", rating: 5 }),
    ];
    const r = yearInReview(lib, 2026);
    expect(r.count).toBe(2);
    expect(r.movies).toBe(1);
    expect(r.tv).toBe(1);
    expect(r.top?.tmdb_id).toBe(2);
  });
  it("is empty for a year with nothing", () => {
    expect(yearInReview([], 2026)).toEqual({ count: 0, movies: 0, tv: 0, top: null });
  });
});
