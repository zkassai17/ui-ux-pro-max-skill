import type { WatchlistEntry } from "../types/db";

export type TasteMatch = {
  // 0–100 agreement over co-rated titles, or null when there isn't enough
  // overlap to be meaningful (fewer than MIN_CORATED titles rated by both).
  score: number | null;
  // How many titles both people have given a 1–5 rating.
  coRated: number;
  // Titles both rated 4+ — the "you'd both vouch for these" list. Returned as
  // the friend's entries so the UI can show their poster/title, best first.
  sharedFavorites: WatchlistEntry[];
};

const MIN_CORATED = 3;
const FAVORITE_THRESHOLD = 4;
const MAX_DIFF = 4; // 1–5 scale → widest possible gap

function key(e: WatchlistEntry): string {
  return `${e.media_type}:${e.tmdb_id}`;
}

// Index a library by media+tmdb key, keeping only rated entries.
function rentedByKey(entries: WatchlistEntry[]): Map<string, WatchlistEntry> {
  const m = new Map<string, WatchlistEntry>();
  for (const e of entries) {
    if (e.rating == null) continue;
    m.set(key(e), e);
  }
  return m;
}

// Compares two people's personal ratings to produce a "taste match" — a single
// agreement percentage over the titles both have rated, plus the titles they
// both love. Pure: order-independent, no side effects.
export function computeTasteMatch(mine: WatchlistEntry[], theirs: WatchlistEntry[]): TasteMatch {
  const mineByKey = rentedByKey(mine);
  const theirsByKey = rentedByKey(theirs);

  let agreementSum = 0;
  let coRated = 0;
  const favorites: { entry: WatchlistEntry; friendRating: number }[] = [];

  for (const [k, myEntry] of mineByKey) {
    const theirEntry = theirsByKey.get(k);
    if (!theirEntry) continue;
    coRated += 1;
    const diff = Math.abs((myEntry.rating as number) - (theirEntry.rating as number));
    agreementSum += 1 - diff / MAX_DIFF;
    if ((myEntry.rating as number) >= FAVORITE_THRESHOLD && (theirEntry.rating as number) >= FAVORITE_THRESHOLD) {
      favorites.push({ entry: theirEntry, friendRating: theirEntry.rating as number });
    }
  }

  const score = coRated >= MIN_CORATED ? Math.round((agreementSum / coRated) * 100) : null;

  const sharedFavorites = favorites
    .sort((a, b) => b.friendRating - a.friendRating || a.entry.title.localeCompare(b.entry.title))
    .map((f) => f.entry);

  return { score, coRated, sharedFavorites };
}
