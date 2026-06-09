import { computeTasteMatch } from "../tasteMatchLogic";
import type { WatchlistEntry } from "../../types/db";

function entry(p: Partial<WatchlistEntry> & { tmdb_id: number }): WatchlistEntry {
  return {
    id: `id-${p.tmdb_id}-${p.user_id ?? "u"}`,
    user_id: p.user_id ?? "me",
    tmdb_id: p.tmdb_id,
    media_type: p.media_type ?? "movie",
    title: p.title ?? `Title ${p.tmdb_id}`,
    poster_path: p.poster_path ?? null,
    year: p.year ?? null,
    status: p.status ?? "watched",
    rating: p.rating ?? null,
    added_at: p.added_at ?? "2026-01-01T00:00:00Z",
  };
}

// n watched titles sharing tmdb ids 1..n, all unrated unless ratings given.
function watched(ids: number[], ratings: Record<number, number> = {}, user = "me"): WatchlistEntry[] {
  return ids.map((id) => entry({ tmdb_id: id, status: "watched", rating: ratings[id] ?? null, user_id: user }));
}

describe("computeTasteMatch", () => {
  it("returns a null/none score when fewer than 3 titles are co-watched", () => {
    const r = computeTasteMatch(watched([1, 2]), watched([1, 2]));
    expect(r.score).toBeNull();
    expect(r.basis).toBe("none");
    expect(r.coWatched).toBe(2);
  });

  it("scores from watch history alone, with no ratings ('history' basis)", () => {
    // both watched exactly the same 6 → coverage 1, confidence 1 → 100
    const r = computeTasteMatch(watched([1, 2, 3, 4, 5, 6]), watched([1, 2, 3, 4, 5, 6]));
    expect(r.basis).toBe("history");
    expect(r.coRated).toBe(0);
    expect(r.score).toBe(100);
    expect(r.coWatched).toBe(6);
  });

  it("coverage is measured against the smaller library so a big watcher isn't punished", () => {
    // I watched 100 titles, friend watched 5, all 5 shared → coverage 1.
    const mine = watched(Array.from({ length: 100 }, (_, i) => i + 1));
    const theirs = watched([1, 2, 3, 4, 5], {}, "friend");
    const r = computeTasteMatch(mine, theirs);
    expect(r.coWatched).toBe(5);
    expect(r.score).toBe(100);
  });

  it("applies a small-sample confidence dampener at the minimum overlap", () => {
    // exactly 3 co-watched, full coverage → confidence 3/5 → 60
    const r = computeTasteMatch(watched([1, 2, 3]), watched([1, 2, 3]));
    expect(r.score).toBe(60);
    expect(r.basis).toBe("history");
  });

  it("lowers the score when the libraries only partially overlap", () => {
    // both watched 10; they share only 5 → coverage 5/10 = 0.5, confidence 1 → 50
    const mine = watched([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const theirs = watched([1, 2, 3, 4, 5, 11, 12, 13, 14, 15], {}, "friend");
    const r = computeTasteMatch(mine, theirs);
    expect(r.coWatched).toBe(5);
    expect(r.score).toBe(50);
  });

  it("blends rating agreement once 3+ titles are co-rated", () => {
    // 6 co-watched (overlap 1.0); ratings agree perfectly → blend = 100
    const ratings = { 1: 5, 2: 4, 3: 3 };
    const mine = watched([1, 2, 3, 4, 5, 6], ratings);
    const theirs = watched([1, 2, 3, 4, 5, 6], ratings, "friend");
    const r = computeTasteMatch(mine, theirs);
    expect(r.basis).toBe("blend");
    expect(r.coRated).toBe(3);
    expect(r.score).toBe(100);
  });

  it("blend drops when ratings disagree even though overlap is perfect", () => {
    // overlap 1.0 → 50% weight = 50. Ratings maximally opposed → 0% weight.
    const mine = watched([1, 2, 3, 4, 5, 6], { 1: 1, 2: 1, 3: 1 });
    const theirs = watched([1, 2, 3, 4, 5, 6], { 1: 5, 2: 5, 3: 5 }, "friend");
    const r = computeTasteMatch(mine, theirs);
    expect(r.basis).toBe("blend");
    expect(r.score).toBe(50);
  });

  it("only counts titles both have marked watched", () => {
    const mine = [
      ...watched([1, 2, 3]),
      entry({ tmdb_id: 9, status: "want" }), // not watched
    ];
    const theirs = [
      ...watched([1, 2, 3], {}, "friend"),
      entry({ tmdb_id: 9, status: "watched", user_id: "friend" }),
    ];
    const r = computeTasteMatch(mine, theirs);
    expect(r.coWatched).toBe(3);
  });

  it("does not match titles across media types with the same tmdb id", () => {
    const mine = [
      entry({ tmdb_id: 1, media_type: "movie" }),
      entry({ tmdb_id: 1, media_type: "tv" }),
      entry({ tmdb_id: 2 }),
      entry({ tmdb_id: 3 }),
    ];
    const theirs = [
      entry({ tmdb_id: 1, media_type: "movie", user_id: "friend" }),
      entry({ tmdb_id: 2, user_id: "friend" }),
      entry({ tmdb_id: 3, user_id: "friend" }),
    ];
    const r = computeTasteMatch(mine, theirs);
    expect(r.coWatched).toBe(3);
  });

  it("lists shared favorites (both rated 4+) using the friend's entries, best first", () => {
    const mine = watched([1, 2, 3, 4], { 1: 5, 2: 4, 3: 5, 4: 2 });
    const theirs = watched([1, 2, 3, 4], { 1: 4, 2: 5, 3: 3, 4: 5 }, "friend");
    const r = computeTasteMatch(mine, theirs);
    // both 4+: id 1 (5&4) and id 2 (4&5). id 3 friend gave 3, id 4 I gave 2.
    expect(r.sharedFavorites.map((e) => e.tmdb_id)).toEqual([2, 1]);
    expect(r.sharedFavorites[0].user_id).toBe("friend");
  });

  it("puts co-watched titles that aren't both-loved into alsoBothWatched", () => {
    const mine = watched([1, 2, 3]);
    const theirs = watched([1, 2, 3], {}, "friend");
    const r = computeTasteMatch(mine, theirs);
    expect(r.sharedFavorites).toEqual([]);
    expect(r.alsoBothWatched.map((e) => e.tmdb_id).sort()).toEqual([1, 2, 3]);
    expect(r.alsoBothWatched[0].user_id).toBe("friend");
  });

  it("handles empty libraries safely", () => {
    const r = computeTasteMatch([], []);
    expect(r.score).toBeNull();
    expect(r.basis).toBe("none");
    expect(r.coWatched).toBe(0);
    expect(r.sharedFavorites).toEqual([]);
    expect(r.alsoBothWatched).toEqual([]);
  });
});
