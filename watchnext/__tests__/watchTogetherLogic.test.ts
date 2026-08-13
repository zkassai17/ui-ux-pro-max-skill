import { groupPicks, rankSuggestions, filterByGenre, pickHero } from "../src/lib/watchTogetherLogic";
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
    year: null,
    status: "want",
    rating: null,
    added_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

test("surfaces a title that one person wants and nobody has watched", () => {
  const mine = [wl({ tmdb_id: 1, status: "want" })];
  const theirs = [wl({ tmdb_id: 2, status: "want" })]; // friend doesn't have title 1 at all
  const out = groupPicks([mine, theirs]);
  expect(out.map((p) => p.entry.tmdb_id).sort()).toEqual([1, 2]);
});

test("drops a title if any participant has already watched it", () => {
  const mine = [wl({ tmdb_id: 1, status: "want" })];
  const theirs = [wl({ tmdb_id: 1, status: "watched" })]; // friend already saw it
  expect(groupPicks([mine, theirs])).toEqual([]);
});

test("excludes titles nobody actually wants (e.g. only watching)", () => {
  const mine = [wl({ tmdb_id: 1, status: "watching" })];
  const theirs = [wl({ tmdb_id: 1, status: "watching" })];
  expect(groupPicks([mine, theirs])).toEqual([]);
});

test("counts how many participants want each title (wantedBy)", () => {
  const mine = [wl({ tmdb_id: 1, status: "want" }), wl({ tmdb_id: 2, status: "want" })];
  const theirs = [wl({ tmdb_id: 1, status: "want" })]; // both want 1, only I want 2
  const out = groupPicks([mine, theirs]);
  const byId = Object.fromEntries(out.map((p) => [p.entry.tmdb_id, p.wantedBy]));
  expect(byId).toEqual({ 1: 2, 2: 1 });
});

test("ranks mutual wants ahead of single wants, then freshest", () => {
  const mine = [
    wl({ tmdb_id: 1, status: "want", added_at: "2026-01-01T00:00:00Z" }),
    wl({ tmdb_id: 2, status: "want", added_at: "2026-05-01T00:00:00Z" }),
  ];
  const theirs = [wl({ tmdb_id: 1, status: "want", added_at: "2026-02-01T00:00:00Z" })];
  // title 1 wanted by 2 → first; title 2 wanted by 1 → after
  const out = groupPicks([mine, theirs]);
  expect(out.map((p) => p.entry.tmdb_id)).toEqual([1, 2]);
});

test("matches on media_type, not just id", () => {
  const mine = [wl({ tmdb_id: 1, media_type: "movie", status: "want" })];
  const theirs = [wl({ tmdb_id: 1, media_type: "tv", status: "watched" })];
  // different media types → the movie is still an unseen want; tv is watched & separate
  const out = groupPicks([mine, theirs]);
  expect(out.map((p) => `${p.entry.media_type}:${p.entry.tmdb_id}`)).toEqual(["movie:1"]);
});

test("the representative entry is the freshest want", () => {
  const mine = [wl({ tmdb_id: 1, status: "want", added_at: "2026-01-01T00:00:00Z", title: "Old" })];
  const theirs = [wl({ tmdb_id: 1, status: "want", added_at: "2026-09-01T00:00:00Z", title: "New" })];
  const out = groupPicks([mine, theirs]);
  expect(out[0].entry.title).toBe("New");
});

test("empty input returns empty", () => {
  expect(groupPicks([])).toEqual([]);
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
