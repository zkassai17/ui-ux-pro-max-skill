import { sortLibrary } from "../src/lib/libraryLogic";
import type { WatchlistEntry } from "../src/types/db";

function entry(over: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: "1",
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

test("recent sort orders by added_at descending", () => {
  const a = entry({ id: "a", added_at: "2026-01-01T00:00:00Z" });
  const b = entry({ id: "b", added_at: "2026-03-01T00:00:00Z" });
  const c = entry({ id: "c", added_at: "2026-02-01T00:00:00Z" });
  expect(sortLibrary([a, b, c], "recent").map((e) => e.id)).toEqual(["b", "c", "a"]);
});

test("oldest sort orders by added_at ascending", () => {
  const a = entry({ id: "a", added_at: "2026-01-01T00:00:00Z" });
  const b = entry({ id: "b", added_at: "2026-03-01T00:00:00Z" });
  const c = entry({ id: "c", added_at: "2026-02-01T00:00:00Z" });
  expect(sortLibrary([a, b, c], "oldest").map((e) => e.id)).toEqual(["a", "c", "b"]);
});

test("title sort orders alphabetically, case-insensitive", () => {
  const a = entry({ id: "a", title: "banana" });
  const b = entry({ id: "b", title: "Apple" });
  const c = entry({ id: "c", title: "cherry" });
  expect(sortLibrary([a, b, c], "title").map((e) => e.id)).toEqual(["b", "a", "c"]);
});

test("title-desc sort orders reverse-alphabetically, case-insensitive", () => {
  const a = entry({ id: "a", title: "banana" });
  const b = entry({ id: "b", title: "Apple" });
  const c = entry({ id: "c", title: "cherry" });
  expect(sortLibrary([a, b, c], "title-desc").map((e) => e.id)).toEqual(["c", "a", "b"]);
});

test("rating sort orders by rating descending, unrated last", () => {
  const a = entry({ id: "a", rating: 3 });
  const b = entry({ id: "b", rating: 5 });
  const c = entry({ id: "c", rating: null });
  const d = entry({ id: "d", rating: 4 });
  expect(sortLibrary([a, b, c, d], "rating").map((e) => e.id)).toEqual(["b", "d", "a", "c"]);
});

test("rating sort breaks ties by most recently added", () => {
  const a = entry({ id: "a", rating: 5, added_at: "2026-01-01T00:00:00Z" });
  const b = entry({ id: "b", rating: 5, added_at: "2026-03-01T00:00:00Z" });
  expect(sortLibrary([a, b], "rating").map((e) => e.id)).toEqual(["b", "a"]);
});

test("does not mutate the input array", () => {
  const a = entry({ id: "a", title: "z" });
  const b = entry({ id: "b", title: "a" });
  const input = [a, b];
  sortLibrary(input, "title");
  expect(input.map((e) => e.id)).toEqual(["a", "b"]);
});
