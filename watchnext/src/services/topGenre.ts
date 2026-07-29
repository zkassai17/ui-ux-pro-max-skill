import { getTitleDetails } from "./catalog";
import { topGenre } from "../lib/profileInsights";
import type { WatchlistEntry } from "../types/db";

const SAMPLE = 30; // genres aren't stored, so sample this many watched titles

// Most-watched genre, computed by pulling genres for a sample of watched titles
// (localized via the TMDB language param). Approximate but fetch-bounded.
export async function getTopGenre(library: WatchlistEntry[]): Promise<string | null> {
  const watched = library.filter((e) => e.status === "watched").slice(0, SAMPLE);
  if (watched.length === 0) return null;
  const genreLists = await Promise.all(
    watched.map((e) =>
      getTitleDetails(e.media_type, e.tmdb_id)
        .then((d) => d.genres)
        .catch(() => [] as string[])
    )
  );
  return topGenre(genreLists);
}
