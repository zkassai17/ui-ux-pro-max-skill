import { selectWeightedSeeds, seedWeight } from "../src/lib/forYouLogic";
import type { WatchlistEntry } from "../src/types/db";

function e(over: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: "id",
    user_id: "u",
    tmdb_id: 1,
    media_type: "movie",
    title: "X",
    poster_path: null,
    year: null,
    status: "watched",
    rating: null,
    added_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("seedWeight", () => {
  it("ranks watched > watching > want", () => {
    const w = seedWeight(e({ status: "watched" }));
    const ing = seedWeight(e({ status: "watching" }));
    const want = seedWeight(e({ status: "want" }));
    expect(w).toBeGreaterThan(ing);
    expect(ing).toBeGreaterThan(want);
  });

  it("adds a boost for a higher personal rating", () => {
    const loved = seedWeight(e({ status: "watched", rating: 5 }));
    const meh = seedWeight(e({ status: "watched", rating: 2 }));
    const unrated = seedWeight(e({ status: "watched", rating: null }));
    expect(loved).toBeGreaterThan(meh);
    expect(meh).toBeGreaterThan(unrated);
  });
});

describe("selectWeightedSeeds", () => {
  it("includes every status of the media type (not just watched)", () => {
    const entries = [
      e({ tmdb_id: 1, status: "watched" }),
      e({ tmdb_id: 2, status: "want" }),
      e({ tmdb_id: 3, status: "watching" }),
      e({ tmdb_id: 4, media_type: "tv", status: "watched" }),
    ];
    const seeds = selectWeightedSeeds(entries, "movie", 20);
    expect(seeds.map((s) => s.entry.tmdb_id).sort()).toEqual([1, 2, 3]);
  });

  it("orders strongest-weight first", () => {
    const entries = [
      e({ tmdb_id: 1, status: "want", rating: null }), // 0.6
      e({ tmdb_id: 2, status: "watched", rating: 5 }), // 1.7
      e({ tmdb_id: 3, status: "watching", rating: null }), // 0.9
    ];
    const seeds = selectWeightedSeeds(entries, "movie", 20);
    expect(seeds.map((s) => s.entry.tmdb_id)).toEqual([2, 3, 1]);
  });

  it("caps the count", () => {
    const entries = Array.from({ length: 40 }, (_, i) => e({ tmdb_id: i + 1 }));
    expect(selectWeightedSeeds(entries, "movie", 20)).toHaveLength(20);
  });
});
