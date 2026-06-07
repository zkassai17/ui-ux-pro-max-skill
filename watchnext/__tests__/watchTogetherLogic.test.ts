import { sharedWantToWatch, rankSuggestions, filterByGenre, pickHero } from "../src/lib/watchTogetherLogic";
import type { WatchlistEntry } from "../src/types/db";
import type { Suggestion } from "../src/types/tmdb";

function sg(over: Partial<Suggestion>): Suggestion {
  return { tmdbId: 1, mediaType: "movie", title: "X", year: null, posterPath: null, rating: null, genreIds: [], ...over };
}

function wl(over: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: "id-" + Math.random(),
    user_id: "u",
    tmdb_id: 1,
    media_type: "movie",
    title: "X",
    poster_path: null,
    status: "want",
    rating: null,
    added_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

test("returns titles every participant wants, matched on id+media_type", () => {
  const mine = [wl({ tmdb_id: 1, status: "want" }), wl({ tmdb_id: 2, status: "want" })];
  const theirs = [wl({ tmdb_id: 1, status: "want" }), wl({ tmdb_id: 3, status: "want" })];
  const out = sharedWantToWatch([mine, theirs]);
  expect(out.map((e) => e.tmdb_id)).toEqual([1]);
});

test("excludes a title if any participant has it as not-want", () => {
  const mine = [wl({ tmdb_id: 1, status: "want" })];
  const theirs = [wl({ tmdb_id: 1, status: "watched" })];
  expect(sharedWantToWatch([mine, theirs])).toEqual([]);
});

test("matches on media_type, not just id", () => {
  const mine = [wl({ tmdb_id: 1, media_type: "movie", status: "want" })];
  const theirs = [wl({ tmdb_id: 1, media_type: "tv", status: "want" })];
  expect(sharedWantToWatch([mine, theirs])).toEqual([]);
});

test("works for 4 participants (intersection across all)", () => {
  const a = [wl({ tmdb_id: 1 }), wl({ tmdb_id: 2 })];
  const b = [wl({ tmdb_id: 1 }), wl({ tmdb_id: 2 })];
  const c = [wl({ tmdb_id: 1 }), wl({ tmdb_id: 2 })];
  const d = [wl({ tmdb_id: 1 })]; // d only wants 1
  const out = sharedWantToWatch([a, b, c, d]);
  expect(out.map((e) => e.tmdb_id)).toEqual([1]);
});

test("sorts by most-recent added_at across participants, descending", () => {
  const mine = [
    wl({ tmdb_id: 1, added_at: "2026-01-01T00:00:00Z" }),
    wl({ tmdb_id: 2, added_at: "2026-05-01T00:00:00Z" }),
  ];
  const theirs = [
    wl({ tmdb_id: 1, added_at: "2026-06-01T00:00:00Z" }), // pushes title 1 to newest
    wl({ tmdb_id: 2, added_at: "2026-02-01T00:00:00Z" }),
  ];
  const out = sharedWantToWatch([mine, theirs]);
  expect(out.map((e) => e.tmdb_id)).toEqual([1, 2]);
});

test("empty input returns empty", () => {
  expect(sharedWantToWatch([])).toEqual([]);
});

test("rankSuggestions scores by number of distinct people surfacing a title", () => {
  const a = sg({ tmdbId: 1, title: "A" });
  const b = sg({ tmdbId: 2, title: "B" });
  // person1 -> [a, b], person2 -> [b]; b surfaced by 2 people, a by 1
  const out = rankSuggestions([[a, b], [b]], new Set());
  expect(out.map((x) => x.tmdbId)).toEqual([2, 1]);
});

test("rankSuggestions excludes owned titles", () => {
  const a = sg({ tmdbId: 1 });
  const b = sg({ tmdbId: 2 });
  const out = rankSuggestions([[a, b]], new Set(["movie:1"]));
  expect(out.map((x) => x.tmdbId)).toEqual([2]);
});

test("rankSuggestions counts a person once even if a title repeats in their list", () => {
  const a = sg({ tmdbId: 1 });
  const out = rankSuggestions([[a, a]], new Set());
  expect(out).toHaveLength(1);
});

test("rankSuggestions ties break by rating desc then title", () => {
  const z = sg({ tmdbId: 1, title: "Zebra", rating: 8 });
  const ap = sg({ tmdbId: 2, title: "Apple", rating: 9 });
  const mg = sg({ tmdbId: 3, title: "Mango", rating: 9 });
  const out = rankSuggestions([[z, ap, mg]], new Set());
  expect(out.map((x) => x.tmdbId)).toEqual([2, 3, 1]);
});

test("rankSuggestions caps at 20", () => {
  const lists = [Array.from({ length: 30 }, (_, i) => sg({ tmdbId: i + 1, title: "T" + i }))];
  expect(rankSuggestions(lists, new Set())).toHaveLength(20);
});

test("filterByGenre with empty ids returns the list unchanged", () => {
  const list = [sg({ tmdbId: 1, genreIds: [35] })];
  expect(filterByGenre(list, [])).toBe(list);
});

test("filterByGenre keeps only candidates intersecting the selected ids", () => {
  const comedy = sg({ tmdbId: 1, genreIds: [35] });
  const action = sg({ tmdbId: 2, genreIds: [28] });
  const out = filterByGenre([comedy, action], [35]);
  expect(out.map((x) => x.tmdbId)).toEqual([1]);
});

test("pickHero indexes with wraparound and returns null on empty", () => {
  expect(pickHero(["a", "b", "c"], 0)).toBe("a");
  expect(pickHero(["a", "b", "c"], 4)).toBe("b"); // 4 % 3 = 1
  expect(pickHero([], 0)).toBeNull();
});
