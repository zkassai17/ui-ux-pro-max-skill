import { pickTonight, entryToTitle } from "../src/lib/tonightPick";
import type { WatchlistEntry } from "../src/types/db";

function entry(p: Partial<WatchlistEntry> & { tmdb_id: number; status: WatchlistEntry["status"] }): WatchlistEntry {
  return {
    id: `id-${p.tmdb_id}`,
    tmdb_id: p.tmdb_id,
    media_type: p.media_type ?? "movie",
    title: p.title ?? `Title ${p.tmdb_id}`,
    poster_path: p.poster_path ?? null,
    year: p.year ?? null,
    status: p.status,
    rating: p.rating ?? null,
  } as WatchlistEntry;
}

const empty = new Set<string>();

describe("pickTonight", () => {
  it("returns null when there are no Want-list titles", () => {
    const lib = [entry({ tmdb_id: 1, status: "watched" }), entry({ tmdb_id: 2, status: "watching" })];
    expect(pickTonight(lib, empty, 0)).toBeNull();
  });

  it("returns null for an empty library", () => {
    expect(pickTonight([], empty, 5)).toBeNull();
  });

  it("only ever picks a Want-list title", () => {
    const lib = [
      entry({ tmdb_id: 1, status: "watched" }),
      entry({ tmdb_id: 2, status: "want" }),
      entry({ tmdb_id: 3, status: "watching" }),
    ];
    const pick = pickTonight(lib, empty, 0);
    expect(pick?.tmdbId).toBe(2);
  });

  it("is stable within the same day", () => {
    const lib = [entry({ tmdb_id: 1, status: "want" }), entry({ tmdb_id: 2, status: "want" })];
    expect(pickTonight(lib, empty, 7)?.tmdbId).toBe(pickTonight(lib, empty, 7)?.tmdbId);
  });

  it("rotates across days", () => {
    const lib = [entry({ tmdb_id: 1, status: "want" }), entry({ tmdb_id: 2, status: "want" })];
    const day0 = pickTonight(lib, empty, 0)?.tmdbId;
    const day1 = pickTonight(lib, empty, 1)?.tmdbId;
    expect(day0).not.toBe(day1);
  });

  it("skips hidden (dismissed) titles", () => {
    const lib = [entry({ tmdb_id: 1, status: "want" }), entry({ tmdb_id: 2, status: "want" })];
    // hide whichever day 0 would pick, then day 0 must return the other one
    const first = pickTonight(lib, empty, 0)!;
    const hidden = new Set([`${first.mediaType}:${first.tmdbId}`]);
    const second = pickTonight(lib, hidden, 0);
    expect(second).not.toBeNull();
    expect(second!.tmdbId).not.toBe(first.tmdbId);
  });
});

describe("entryToTitle", () => {
  it("maps snake_case entry fields to the Title shape", () => {
    const e = entry({ tmdb_id: 42, status: "want", title: "Dune", year: "2021", media_type: "movie", poster_path: "/p.jpg", rating: 4 });
    expect(entryToTitle(e)).toEqual({
      tmdbId: 42,
      mediaType: "movie",
      title: "Dune",
      year: "2021",
      posterPath: "/p.jpg",
      rating: 4,
    });
  });
});
