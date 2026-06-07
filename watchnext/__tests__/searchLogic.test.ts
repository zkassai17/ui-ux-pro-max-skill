import { relaxQuery, rankByFuzzy } from "../src/lib/searchLogic";
import type { Title } from "../src/types/tmdb";

function t(over: Partial<Title>): Title {
  return { tmdbId: 1, mediaType: "movie", title: "X", year: null, posterPath: null, rating: null, ...over };
}

test("relaxQuery drops the trailing word when there are multiple words", () => {
  expect(relaxQuery("the dark knight rises now")).toBe("the dark knight rises");
});

test("relaxQuery truncates a single word to a shorter prefix", () => {
  // internal typo: a correct prefix still matches on TMDB
  const r = relaxQuery("intersteller");
  expect(r.length).toBeLessThan("intersteller".length);
  expect("interstellar".startsWith(r)).toBe(true);
});

test("relaxQuery returns empty for very short single words (nothing useful to relax)", () => {
  expect(relaxQuery("ab")).toBe("");
});

test("rankByFuzzy puts the closest title first", () => {
  const a = t({ tmdbId: 1, title: "Zoolander" });
  const b = t({ tmdbId: 2, title: "Interstellar" });
  const ranked = rankByFuzzy("intersteller", [a, b]);
  expect(ranked[0].tmdbId).toBe(2);
});

test("rankByFuzzy is case-insensitive and keeps all titles", () => {
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
