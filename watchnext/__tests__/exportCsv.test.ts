import { buildLibraryCsv } from "../src/lib/exportCsv";
import type { WatchlistEntry } from "../src/types/db";

function e(over: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: "id",
    user_id: "u",
    tmdb_id: 1,
    media_type: "movie",
    title: "X",
    poster_path: null,
    year: "2024",
    status: "watched",
    rating: 5,
    added_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("buildLibraryCsv", () => {
  it("writes a header and one row per entry", () => {
    const csv = buildLibraryCsv([e({ title: "Dune", media_type: "movie" })]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Title,Type,Status,Rating,Year,Added");
    expect(lines[1]).toBe("Dune,Movie,watched,5,2024,2026-01-01T00:00:00Z");
  });

  it("maps tv media type and blank rating", () => {
    const csv = buildLibraryCsv([e({ title: "Severance", media_type: "tv", status: "watching", rating: null })]);
    expect(csv.split("\n")[1]).toBe("Severance,TV,watching,,2024,2026-01-01T00:00:00Z");
  });

  it("escapes titles with commas and quotes", () => {
    const csv = buildLibraryCsv([e({ title: 'Crazy, Stupid, "Love"' })]);
    expect(csv.split("\n")[1].startsWith('"Crazy, Stupid, ""Love""",Movie')).toBe(true);
  });

  it("returns just the header for an empty library", () => {
    expect(buildLibraryCsv([])).toBe("Title,Type,Status,Rating,Year,Added");
  });
});
