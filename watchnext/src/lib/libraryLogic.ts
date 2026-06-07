import type { WatchlistEntry } from "../types/db";

export type LibrarySort = "recent" | "oldest" | "title" | "title-desc";

export function sortLibrary(entries: WatchlistEntry[], sort: LibrarySort): WatchlistEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    case "title-desc":
      return copy.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: "base" }));
    case "oldest":
      return copy.sort((a, b) => a.added_at.localeCompare(b.added_at));
    case "recent":
    default:
      return copy.sort((a, b) => b.added_at.localeCompare(a.added_at));
  }
}
