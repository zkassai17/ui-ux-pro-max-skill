import type { WatchlistEntry } from "../types/db";

export type LibrarySort = "recent" | "title";

export function sortLibrary(entries: WatchlistEntry[], sort: LibrarySort): WatchlistEntry[] {
  const copy = [...entries];
  if (sort === "title") {
    return copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }
  return copy.sort((a, b) => b.added_at.localeCompare(a.added_at));
}
