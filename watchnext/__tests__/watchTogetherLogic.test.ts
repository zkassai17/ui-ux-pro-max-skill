import { sharedWantToWatch } from "../src/lib/watchTogetherLogic";
import type { WatchlistEntry } from "../src/types/db";

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
