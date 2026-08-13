import type { WatchlistEntry } from "../types/db";

export type TasteMatchBasis = "blend" | "history" | "none";

export type TasteMatch = {
  // 0–100 taste match, or null when there isn't enough shared history to be
  // meaningful (fewer than MIN_OVERLAP titles both people have watched).
  score: number | null;
  // What drove the score: "blend" = watch overlap + rating agreement,
  // "history" = overlap only (not enough co-ratings yet), "none" = no score.
  basis: TasteMatchBasis;
  // Titles both people have marked watched.
  coWatched: number;
  // Of those, how many both also gave a 1–5 rating.
  coRated: number;
  // Co-watched titles both rated 4+ — "you both love these". Friend's entries,
  // best first.
  sharedFavorites: WatchlistEntry[];
  // Other co-watched titles (not both-loved) — "you've both seen these".
  // Friend's entries, A–Z.
  alsoBothWatched: WatchlistEntry[];
};

const MIN_OVERLAP = 3; // titles both watched before we show any score
const MIN_RATED = 3; // co-ratings before ratings influence the score
const FAVORITE_THRESHOLD = 4;
const MAX_DIFF = 4; // 1–5 scale → widest possible gap
const CONF_FULL = 5; // co-watched count at which we trust the overlap fully

function key(e: WatchlistEntry): string {
  return `${e.media_type}:${e.tmdb_id}`;
}

function watchedByKey(entries: WatchlistEntry[]): Map<string, WatchlistEntry> {
  const m = new Map<string, WatchlistEntry>();
  for (const e of entries) {
    if (e.status !== "watched") continue;
    m.set(key(e), e);
  }
  return m;
}

// Blends two people's watch histories into a single "taste match" percentage.
// The metric works from watch history alone — it does NOT require ratings — so
// it lights up as soon as two people have watched some of the same titles, and
// sharpens once they start rating. Pure: order-independent, no side effects.
//
// Score model:
//   overlapScore  = (co-watched / smaller library's watched count)  ← coverage
//                   × (min(co-watched, CONF_FULL) / CONF_FULL)       ← confidence
//   ratingScore   = avg(1 - |diff|/4) over titles both rated
//   blend         = 50% overlap + 50% rating  (once MIN_RATED co-ratings exist)
//   history-only  = overlap alone             (before then)
export function computeTasteMatch(mine: WatchlistEntry[], theirs: WatchlistEntry[]): TasteMatch {
  const myWatched = watchedByKey(mine);
  const theirWatched = watchedByKey(theirs);

  let coWatched = 0;
  let coRated = 0;
  let agreementSum = 0;
  const favorites: WatchlistEntry[] = [];
  const alsoWatched: WatchlistEntry[] = [];

  for (const [k, myEntry] of myWatched) {
    const theirEntry = theirWatched.get(k);
    if (!theirEntry) continue;
    coWatched += 1;

    const bothRated = myEntry.rating != null && theirEntry.rating != null;
    if (bothRated) {
      coRated += 1;
      agreementSum += 1 - Math.abs((myEntry.rating as number) - (theirEntry.rating as number)) / MAX_DIFF;
    }

    const bothLove =
      (myEntry.rating ?? 0) >= FAVORITE_THRESHOLD && (theirEntry.rating ?? 0) >= FAVORITE_THRESHOLD;
    if (bothLove) favorites.push(theirEntry);
    else alsoWatched.push(theirEntry);
  }

  if (coWatched < MIN_OVERLAP) {
    return {
      score: null,
      basis: "none",
      coWatched,
      coRated,
      sharedFavorites: [],
      alsoBothWatched: [],
    };
  }

  const smaller = Math.min(myWatched.size, theirWatched.size);
  const coverage = smaller === 0 ? 0 : coWatched / smaller;
  const confidence = Math.min(coWatched, CONF_FULL) / CONF_FULL;
  const overlapScore = coverage * confidence; // 0..1

  let score: number;
  let basis: TasteMatchBasis;
  if (coRated >= MIN_RATED) {
    const ratingScore = agreementSum / coRated; // 0..1
    score = Math.round((0.5 * overlapScore + 0.5 * ratingScore) * 100);
    basis = "blend";
  } else {
    score = Math.round(overlapScore * 100);
    basis = "history";
  }

  favorites.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || a.title.localeCompare(b.title));
  alsoWatched.sort((a, b) => a.title.localeCompare(b.title));

  return { score, basis, coWatched, coRated, sharedFavorites: favorites, alsoBothWatched: alsoWatched };
}
