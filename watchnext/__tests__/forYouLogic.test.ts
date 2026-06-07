import { rankRecommendations, titleKey } from "../src/lib/forYouLogic";
import type { Title } from "../src/types/tmdb";

function t(over: Partial<Title>): Title {
  return { tmdbId: 1, mediaType: "movie", title: "X", year: null, posterPath: null, rating: null, ...over };
}

test("frequency across seed lists drives ranking", () => {
  const a = t({ tmdbId: 1, title: "A" });
  const b = t({ tmdbId: 2, title: "B" });
  // B appears twice, A once
  const ranked = rankRecommendations([[a, b], [b]], new Set());
  expect(ranked.map((x) => x.tmdbId)).toEqual([2, 1]);
});

test("excludes titles already in library", () => {
  const a = t({ tmdbId: 1, title: "A" });
  const b = t({ tmdbId: 2, title: "B" });
  const ranked = rankRecommendations([[a, b]], new Set([titleKey(a)]));
  expect(ranked.map((x) => x.tmdbId)).toEqual([2]);
});

test("ties broken by rating descending then title", () => {
  const a = t({ tmdbId: 1, title: "Zebra", rating: 8 });
  const b = t({ tmdbId: 2, title: "Apple", rating: 9 });
  const c = t({ tmdbId: 3, title: "Mango", rating: 9 });
  const ranked = rankRecommendations([[a, b, c]], new Set());
  // b and c both rating 9 -> alphabetical Apple before Mango; a rating 8 last
  expect(ranked.map((x) => x.tmdbId)).toEqual([2, 3, 1]);
});

test("same tmdb id but different media type are distinct", () => {
  const movie = t({ tmdbId: 1, mediaType: "movie", title: "M" });
  const show = t({ tmdbId: 1, mediaType: "tv", title: "S" });
  const ranked = rankRecommendations([[movie, show]], new Set());
  expect(ranked).toHaveLength(2);
});

test("deduplicates within a single seed list (one vote per seed)", () => {
  const a = t({ tmdbId: 1, title: "A" });
  const b = t({ tmdbId: 2, title: "B" });
  // A listed twice in the same seed list counts once; tie broken by title
  const ranked = rankRecommendations([[a, a, b]], new Set());
  expect(ranked.map((x) => x.tmdbId)).toEqual([1, 2]);
});
