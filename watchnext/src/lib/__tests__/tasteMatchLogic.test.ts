import { computeTasteMatch } from "../tasteMatchLogic";
import type { WatchlistEntry } from "../../types/db";

function entry(p: Partial<WatchlistEntry> & { tmdb_id: number; rating: number | null }): WatchlistEntry {
  return {
    id: `id-${p.tmdb_id}-${p.user_id ?? "u"}`,
    user_id: p.user_id ?? "me",
    tmdb_id: p.tmdb_id,
    media_type: p.media_type ?? "movie",
    title: p.title ?? `Title ${p.tmdb_id}`,
    poster_path: p.poster_path ?? null,
    year: p.year ?? null,
    status: p.status ?? "watched",
    rating: p.rating,
    added_at: p.added_at ?? "2026-01-01T00:00:00Z",
  };
}

describe("computeTasteMatch", () => {
  it("returns null score when fewer than 3 titles are co-rated", () => {
    const mine = [entry({ tmdb_id: 1, rating: 5 }), entry({ tmdb_id: 2, rating: 4 })];
    const theirs = [entry({ tmdb_id: 1, rating: 5 }), entry({ tmdb_id: 2, rating: 4 })];
    const r = computeTasteMatch(mine, theirs);
    expect(r.score).toBeNull();
    expect(r.coRated).toBe(2);
  });

  it("scores 100 when all co-rated titles match exactly", () => {
    const mine = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 4 }),
      entry({ tmdb_id: 3, rating: 2 }),
    ];
    const theirs = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 4 }),
      entry({ tmdb_id: 3, rating: 2 }),
    ];
    const r = computeTasteMatch(mine, theirs);
    expect(r.score).toBe(100);
    expect(r.coRated).toBe(3);
  });

  it("scores 0 when every co-rated title is maximally opposed", () => {
    const mine = [
      entry({ tmdb_id: 1, rating: 1 }),
      entry({ tmdb_id: 2, rating: 1 }),
      entry({ tmdb_id: 3, rating: 5 }),
    ];
    const theirs = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 5 }),
      entry({ tmdb_id: 3, rating: 1 }),
    ];
    const r = computeTasteMatch(mine, theirs);
    expect(r.score).toBe(0);
  });

  it("computes a partial score from per-title agreement", () => {
    // diffs: 0, 1, 2 over a 0–4 range → agreements 1, 0.75, 0.5 → avg 0.75 → 75
    const mine = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 4 }),
      entry({ tmdb_id: 3, rating: 5 }),
    ];
    const theirs = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 5 }),
      entry({ tmdb_id: 3, rating: 3 }),
    ];
    const r = computeTasteMatch(mine, theirs);
    expect(r.score).toBe(75);
  });

  it("only counts titles both users have rated", () => {
    const mine = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 4 }),
      entry({ tmdb_id: 3, rating: 3 }),
      entry({ tmdb_id: 4, rating: 5 }), // they haven't rated
    ];
    const theirs = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 4 }),
      entry({ tmdb_id: 3, rating: 3 }),
      entry({ tmdb_id: 5, rating: 2 }), // I haven't rated
    ];
    const r = computeTasteMatch(mine, theirs);
    expect(r.coRated).toBe(3);
    expect(r.score).toBe(100);
  });

  it("does not match titles across media types with the same tmdb id", () => {
    const mine = [
      entry({ tmdb_id: 1, media_type: "movie", rating: 5 }),
      entry({ tmdb_id: 1, media_type: "tv", rating: 1 }),
      entry({ tmdb_id: 2, rating: 4 }),
      entry({ tmdb_id: 3, rating: 3 }),
    ];
    const theirs = [
      entry({ tmdb_id: 1, media_type: "movie", rating: 5 }),
      entry({ tmdb_id: 2, rating: 4 }),
      entry({ tmdb_id: 3, rating: 3 }),
    ];
    const r = computeTasteMatch(mine, theirs);
    expect(r.coRated).toBe(3);
  });

  it("ignores unrated entries entirely", () => {
    const mine = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: null }),
      entry({ tmdb_id: 3, rating: 4 }),
      entry({ tmdb_id: 4, rating: 3 }),
    ];
    const theirs = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 5 }),
      entry({ tmdb_id: 3, rating: 4 }),
      entry({ tmdb_id: 4, rating: 3 }),
    ];
    const r = computeTasteMatch(mine, theirs);
    expect(r.coRated).toBe(3);
    expect(r.score).toBe(100);
  });

  it("lists shared favorites (both rated 4+) using the friend's entries, best first", () => {
    const mine = [
      entry({ tmdb_id: 1, rating: 5 }),
      entry({ tmdb_id: 2, rating: 4 }),
      entry({ tmdb_id: 3, rating: 5 }),
      entry({ tmdb_id: 4, rating: 2 }),
    ];
    const theirs = [
      entry({ tmdb_id: 1, rating: 4, user_id: "friend", title: "Friend One" }),
      entry({ tmdb_id: 2, rating: 5, user_id: "friend", title: "Friend Two" }),
      entry({ tmdb_id: 3, rating: 3, user_id: "friend", title: "Friend Three" }),
      entry({ tmdb_id: 4, rating: 5, user_id: "friend", title: "Friend Four" }),
    ];
    const r = computeTasteMatch(mine, theirs);
    // shared favorites: id 1 (5&4) and id 2 (4&5). id 3 friend gave 3, id 4 I gave 2.
    expect(r.sharedFavorites.map((e) => e.tmdb_id)).toEqual([2, 1]);
    expect(r.sharedFavorites[0].user_id).toBe("friend");
  });

  it("handles empty libraries safely", () => {
    const r = computeTasteMatch([], []);
    expect(r.score).toBeNull();
    expect(r.coRated).toBe(0);
    expect(r.sharedFavorites).toEqual([]);
  });
});
