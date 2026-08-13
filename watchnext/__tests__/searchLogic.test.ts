import { relaxQueries, rankByFuzzy } from "../src/lib/searchLogic";
import type { Title } from "../src/types/tmdb";

function t(over: Partial<Title>): Title {
  return { tmdbId: 1, mediaType: "movie", title: "X", year: null, posterPath: null, rating: null, ...over };
}

test("relaxQueries retries each word for multi-word queries", () => {
  expect(relaxQueries("covra kai")).toEqual(["covra", "kai"]);
});

test("relaxQueries truncates a single word to a shorter prefix", () => {
  // internal typo: a correct prefix still matches on TMDB
  const [r] = relaxQueries("intersteller");
  expect(r.length).toBeLessThan("intersteller".length);
  expect("interstellar".startsWith(r)).toBe(true);
});

test("relaxQueries returns nothing for very short single words", () => {
  expect(relaxQueries("ab")).toEqual([]);
});

test("rankByFuzzy puts the closest title first", () => {
  const a = t({ tmdbId: 1, title: "Zoolander" });
  const b = t({ tmdbId: 2, title: "Interstellar" });
  const ranked = rankByFuzzy("intersteller", [a, b]);
  expect(ranked[0].tmdbId).toBe(2);
});

test("rankByFuzzy surfaces Cobra Kai for a misspelled multi-word query", () => {
  const a = t({ tmdbId: 1, title: "Cobra Kai" });
  const b = t({ tmdbId: 2, title: "Kai" });
  const c = t({ tmdbId: 3, title: "Random Show" });
  const ranked = rankByFuzzy("covra kai", [c, b, a], 0.34);
  expect(ranked[0].tmdbId).toBe(1);
  expect(ranked.find((x) => x.tmdbId === 3)).toBeUndefined();
});

test("rankByFuzzy is case-insensitive and keeps all titles without a threshold", () => {
  const a = t({ tmdbId: 1, title: "THE MATRIX" });
  const b = t({ tmdbId: 2, title: "Matrix Reloaded" });
  const ranked = rankByFuzzy("matrix", [a, b]);
  expect(ranked).toHaveLength(2);
});

test("rankByFuzzy does not mutate input", () => {
  const a = t({ tmdbId: 1, title: "B" });
  const b = t({ tmdbId: 2, title: "A" });
  const input = [a, b];
  rankByFuzzy("a", input);
  expect(input.map((x) => x.tmdbId)).toEqual([1, 2]);
});
