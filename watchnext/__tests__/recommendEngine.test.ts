import {
  buildGenreProfile,
  contentScore,
  collaborativeScore,
  collaborativeWeight,
  rankHybrid,
  learnLanguages,
  dominantLanguage,
  filterByLanguage,
  type GenreTitle,
  type Neighbor,
} from "../src/lib/recommendEngine";
import { titleKey } from "../src/lib/forYouLogic";
import type { Title } from "../src/types/tmdb";
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

function gt(over: Partial<GenreTitle>): GenreTitle {
  return { tmdbId: 1, mediaType: "movie", title: "X", year: null, posterPath: null, rating: null, genreIds: [], ...over };
}

const key = (tmdbId: number, mediaType: "movie" | "tv" = "movie") => titleKey({ mediaType, tmdbId });

describe("buildGenreProfile", () => {
  it("weights genres by each title's seed weight", () => {
    const lib = [
      e({ tmdb_id: 1, status: "watched", rating: 5 }), // weight 1.7
      e({ tmdb_id: 2, status: "want", rating: null }), // weight 0.6
    ];
    const genres = new Map<string, number[]>([
      [key(1), [18]], // drama
      [key(2), [18, 28]], // drama + action
    ]);
    const profile = buildGenreProfile(lib, genres);
    expect(profile.get(18)).toBeCloseTo(2.3, 6); // 1.7 + 0.6
    expect(profile.get(28)).toBeCloseTo(0.6, 6);
  });

  it("ignores titles with no known genres", () => {
    const lib = [e({ tmdb_id: 1 })];
    const profile = buildGenreProfile(lib, new Map());
    expect(profile.size).toBe(0);
  });
});

describe("contentScore", () => {
  const profile = new Map<number, number>([
    [18, 3], // drama heavy
    [28, 1], // action light
  ]);

  it("scores a perfect-genre match highest", () => {
    expect(contentScore([18], profile)).toBeCloseTo(3 / 4, 6);
    expect(contentScore([28], profile)).toBeCloseTo(1 / 4, 6);
  });

  it("returns 0 when no genres overlap", () => {
    expect(contentScore([99], profile)).toBe(0);
  });

  it("returns 0 for an empty profile (cold start)", () => {
    expect(contentScore([18], new Map())).toBe(0);
  });

  it("does not double-count a repeated genre", () => {
    expect(contentScore([18, 18], profile)).toBeCloseTo(3 / 4, 6);
  });
});

describe("collaborativeScore", () => {
  const neighbors: Neighbor[] = [
    { affinity: 0.9, likedKeys: new Set([key(1)]) },
    { affinity: 0.5, likedKeys: new Set([key(1), key(2)]) },
  ];

  it("sums affinity of neighbors who like the title", () => {
    expect(collaborativeScore(key(1), neighbors)).toBeCloseTo(1.4, 6);
    expect(collaborativeScore(key(2), neighbors)).toBeCloseTo(0.5, 6);
  });

  it("is 0 when no neighbor likes it", () => {
    expect(collaborativeScore(key(99), neighbors)).toBe(0);
  });
});

describe("collaborativeWeight (cold-start ramp)", () => {
  it("is 0 with no neighbors", () => {
    expect(collaborativeWeight(0, 1)).toBe(0);
  });

  it("rises toward the max as neighbors accumulate", () => {
    const few = collaborativeWeight(1, 1);
    const more = collaborativeWeight(10, 1);
    expect(few).toBeGreaterThan(0);
    expect(more).toBeGreaterThan(few);
    expect(more).toBeLessThan(1);
  });
});

describe("language matching", () => {
  it("learnLanguages collects the distinct languages, ignoring blanks", () => {
    expect(learnLanguages(["en", "en", "ko", null, undefined])).toEqual(new Set(["en", "ko"]));
  });

  it("dominantLanguage picks the most frequent", () => {
    expect(dominantLanguage(["en", "en", "ko"])).toBe("en");
    expect(dominantLanguage([])).toBeNull();
  });

  it("filterByLanguage drops candidates outside my languages", () => {
    const items = [
      gt({ tmdbId: 1, originalLanguage: "en" }),
      gt({ tmdbId: 2, originalLanguage: "hi" }), // an Indian show
      gt({ tmdbId: 3, originalLanguage: "ko" }),
    ];
    const out = filterByLanguage(items, new Set(["en", "ko"]));
    expect(out.map((x) => x.tmdbId)).toEqual([1, 3]);
  });

  it("filterByLanguage keeps everything when no languages are known (cold start)", () => {
    const items = [gt({ tmdbId: 1, originalLanguage: "hi" })];
    expect(filterByLanguage(items, new Set())).toHaveLength(1);
  });

  it("filterByLanguage keeps candidates with unknown language", () => {
    const items = [gt({ tmdbId: 1, originalLanguage: null })];
    expect(filterByLanguage(items, new Set(["en"]))).toHaveLength(1);
  });
});

describe("rankHybrid", () => {
  const profile = new Map<number, number>([[18, 3], [28, 1]]);
  const weights = { content: 1, collaborative: 1, trending: 0.4 };

  it("ranks a strong content match above a weak one", () => {
    const drama = gt({ tmdbId: 1, title: "Drama", genreIds: [18] });
    const action = gt({ tmdbId: 2, title: "Action", genreIds: [28] });
    const ranked = rankHybrid({
      candidates: [action, drama],
      profile,
      neighbors: [],
      trendingKeys: new Set(),
      weights,
      excludeKeys: new Set(),
    });
    expect(ranked.map((t) => t.tmdbId)).toEqual([1, 2]);
  });

  it("lets a collaborative pick beat a purely-content one", () => {
    const contentOnly = gt({ tmdbId: 1, title: "A", genreIds: [18] }); // content 0.75
    const friendLoved = gt({ tmdbId: 2, title: "B", genreIds: [28] }); // content 0.25 + collab 0.9
    const ranked = rankHybrid({
      candidates: [contentOnly, friendLoved],
      profile,
      neighbors: [{ affinity: 0.9, likedKeys: new Set([key(2)]) }],
      trendingKeys: new Set(),
      weights,
      excludeKeys: new Set(),
    });
    expect(ranked.map((t) => t.tmdbId)).toEqual([2, 1]);
  });

  it("excludes library titles and dedupes", () => {
    const a = gt({ tmdbId: 1, genreIds: [18] });
    const dup = gt({ tmdbId: 1, genreIds: [18] });
    const b = gt({ tmdbId: 2, genreIds: [18] });
    const ranked = rankHybrid({
      candidates: [a, dup, b],
      profile,
      neighbors: [],
      trendingKeys: new Set(),
      weights,
      excludeKeys: new Set([key(2)]),
    });
    expect(ranked.map((t) => t.tmdbId)).toEqual([1]);
  });

  it("drops candidates nothing recommends (score 0)", () => {
    const unrelated = gt({ tmdbId: 5, genreIds: [99] }); // no content, no collab, not trending
    const ranked = rankHybrid({
      candidates: [unrelated],
      profile,
      neighbors: [],
      trendingKeys: new Set(),
      weights,
      excludeKeys: new Set(),
    });
    expect(ranked).toHaveLength(0);
  });

  it("still surfaces trending when there's no taste profile (cold start)", () => {
    const trendy = gt({ tmdbId: 7, genreIds: [], title: "Trendy" });
    const ranked = rankHybrid({
      candidates: [trendy],
      profile: new Map(),
      neighbors: [],
      trendingKeys: new Set([key(7)]),
      weights,
      excludeKeys: new Set(),
    });
    expect(ranked.map((t) => t.tmdbId)).toEqual([7]);
  });
});
