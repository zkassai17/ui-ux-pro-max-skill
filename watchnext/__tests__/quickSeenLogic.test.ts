import { buildCandidatePool } from "../src/lib/quickSeenLogic";
import type { Title } from "../src/types/tmdb";

function t(over: Partial<Title>): Title {
  return { tmdbId: 1, mediaType: "movie", title: "X", year: null, posterPath: "/p.jpg", rating: null, ...over };
}

test("flattens multiple source lists into one pool", () => {
  const a = t({ tmdbId: 1, title: "A" });
  const b = t({ tmdbId: 2, title: "B" });
  const c = t({ tmdbId: 3, title: "C" });
  const out = buildCandidatePool([[a, b], [c]], new Set());
  expect(out.map((x) => x.tmdbId).sort()).toEqual([1, 2, 3]);
});

test("dedupes by mediaType:tmdbId across lists", () => {
  const a = t({ tmdbId: 1, mediaType: "movie" });
  const dup = t({ tmdbId: 1, mediaType: "movie" });
  const out = buildCandidatePool([[a], [dup]], new Set());
  expect(out).toHaveLength(1);
});

test("treats same id with different mediaType as distinct", () => {
  const movie = t({ tmdbId: 1, mediaType: "movie" });
  const tv = t({ tmdbId: 1, mediaType: "tv" });
  const out = buildCandidatePool([[movie, tv]], new Set());
  expect(out).toHaveLength(2);
});

test("excludes titles already in the library", () => {
  const a = t({ tmdbId: 1, mediaType: "movie" });
  const b = t({ tmdbId: 2, mediaType: "tv" });
  const out = buildCandidatePool([[a, b]], new Set(["movie:1"]));
  expect(out.map((x) => x.tmdbId)).toEqual([2]);
});

test("drops candidates with no poster (nothing to tap)", () => {
  const withPoster = t({ tmdbId: 1, posterPath: "/p.jpg" });
  const noPoster = t({ tmdbId: 2, posterPath: null });
  const out = buildCandidatePool([[withPoster, noPoster]], new Set());
  expect(out.map((x) => x.tmdbId)).toEqual([1]);
});

test("preserves first-seen order (trending before discover)", () => {
  const first = t({ tmdbId: 10, title: "Trending" });
  const second = t({ tmdbId: 20, title: "Popular" });
  const out = buildCandidatePool([[first], [second]], new Set());
  expect(out.map((x) => x.tmdbId)).toEqual([10, 20]);
});

test("empty input returns empty", () => {
  expect(buildCandidatePool([], new Set())).toEqual([]);
});
