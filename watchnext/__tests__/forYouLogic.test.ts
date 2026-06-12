import {
  rankForYou,
  selectWeightedSeeds,
  seedWeight,
  titleKey,
} from "../src/lib/forYouLogic";
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

describe("rankForYou", () => {
  it("weights a strong seed's picks above a weak seed's picks", () => {
    const fromWatched = t({ tmdbId: 1, title: "A" });
    const fromWant = t({ tmdbId: 2, title: "B" });
    const ranked = rankForYou(
      [
        { weight: 1.7, titles: [fromWatched] }, // watched+loved seed
        { weight: 0.6, titles: [fromWant] }, // want seed
      ],
      [],
      0.4,
      new Set(),
    );
    expect(ranked.map((x) => x.tmdbId)).toEqual([1, 2]);
  });

  it("gives trending a small boost over an equally-recommended non-trending title", () => {
    const trendy = t({ tmdbId: 1, title: "A" });
    const plain = t({ tmdbId: 2, title: "B" });
    // both recommended once at weight 1.0; #1 is also trending -> edges ahead
    const ranked = rankForYou(
      [{ weight: 1.0, titles: [trendy, plain] }],
      [trendy],
      0.4,
      new Set(),
    );
    expect(ranked.map((x) => x.tmdbId)).toEqual([1, 2]);
  });

  it("falls back to trending when there are no seeds (never empty)", () => {
    const a = t({ tmdbId: 1, title: "A" });
    const b = t({ tmdbId: 2, title: "B" });
    const ranked = rankForYou([], [a, b], 0.4, new Set());
    expect(ranked).toHaveLength(2);
  });

  it("excludes titles already in the library, even if trending", () => {
    const a = t({ tmdbId: 1, title: "A" });
    const b = t({ tmdbId: 2, title: "B" });
    const ranked = rankForYou([{ weight: 1, titles: [a, b] }], [a], 0.4, new Set([titleKey(a)]));
    expect(ranked.map((x) => x.tmdbId)).toEqual([2]);
  });

  it("counts one vote per seed (dedupes within a seed list)", () => {
    const a = t({ tmdbId: 1, title: "A" });
    const b = t({ tmdbId: 2, title: "B" });
    const ranked = rankForYou([{ weight: 1, titles: [a, a, b] }], [], 0.4, new Set());
    // A and B both scored 1; tie broken alphabetically
    expect(ranked.map((x) => x.tmdbId)).toEqual([1, 2]);
  });

  it("accumulates weight across seeds that surface the same title", () => {
    const shared = t({ tmdbId: 1, title: "Shared" });
    const solo = t({ tmdbId: 2, title: "Solo" });
    const ranked = rankForYou(
      [
        { weight: 0.6, titles: [shared] },
        { weight: 0.6, titles: [shared] },
        { weight: 1.0, titles: [solo] },
      ],
      [],
      0.4,
      new Set(),
    );
    // shared = 1.2 > solo = 1.0
    expect(ranked.map((x) => x.tmdbId)).toEqual([1, 2]);
  });

  it("a single Want-recommended title still outranks a purely trending one", () => {
    const wanted = t({ tmdbId: 1, title: "A" });
    const trendOnly = t({ tmdbId: 2, title: "B" });
    const ranked = rankForYou([{ weight: 0.6, titles: [wanted] }], [trendOnly], 0.4, new Set());
    expect(ranked.map((x) => x.tmdbId)).toEqual([1, 2]);
  });
});
