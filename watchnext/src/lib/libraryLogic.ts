import type { WatchlistEntry } from "../types/db";

export type LibrarySort = "recent" | "oldest" | "title" | "title-desc" | "rating";

// Pure optimistic update for inline rating: returns a new list where the entry
// with `entryId` has its rating set. Setting a rating implies the title was
// watched, so status flips to "watched"; clearing (null) leaves status as-is.
// Tolerant of undefined input so it can be used directly in setQueryData.
export function applyInlineRating<T extends WatchlistEntry[] | undefined>(
  entries: T,
  entryId: string,
  rating: number | null,
): T {
  if (!Array.isArray(entries)) return entries;
  return entries.map((entry) =>
    entry.id === entryId
      ? { ...entry, rating, status: rating != null ? "watched" : entry.status }
      : entry,
  ) as T;
}

export function sortLibrary(entries: WatchlistEntry[], sort: LibrarySort): WatchlistEntry[] {
  const copy = [...entries];
  switch (sort) {
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    case "title-desc":
      return copy.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: "base" }));
    case "oldest":
      return copy.sort((a, b) => a.added_at.localeCompare(b.added_at));
    case "rating":
      return copy.sort((a, b) => {
        const ra = a.rating ?? -1;
        const rb = b.rating ?? -1;
        if (rb !== ra) return rb - ra;
        return b.added_at.localeCompare(a.added_at);
      });
    case "recent":
    default:
      return copy.sort((a, b) => b.added_at.localeCompare(a.added_at));
  }
}
