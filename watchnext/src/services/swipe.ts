import type { WatchlistEntry } from "../types/db";
import type { Title } from "../types/tmdb";
import { discoverTitles } from "./tmdb";
import { titleKey } from "../lib/forYouLogic";

function interleave(a: Title[], b: Title[]): Title[] {
  const out: Title[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) out.push(a[i]);
    if (b[i]) out.push(b[i]);
  }
  return out;
}

const DECK_PAGES = 3; // depth of the deck per media type

// The swipe deck: the most-watched titles of ALL TIME (sorted by total vote
// count), movies and shows interleaved — the recognizable stuff people have
// actually seen, not this week's buzz. Excludes anything already in your library.
export async function getSwipeDeck(library: WatchlistEntry[]): Promise<Title[]> {
  const fetchMedia = (mediaType: "movie" | "tv") =>
    Promise.all(
      Array.from({ length: DECK_PAGES }, (_, i) =>
        discoverTitles({ mediaType, sortBy: "vote_count.desc", minVotes: 1000, page: i + 1 })
          .then((p) => p.results)
          .catch(() => [] as Title[]),
      ),
    ).then((pages) => pages.flat());

  const [movies, shows] = await Promise.all([fetchMedia("movie"), fetchMedia("tv")]);

  const excluded = new Set(library.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })));
  const seen = new Set<string>();
  const out: Title[] = [];
  for (const t of interleave(movies, shows)) {
    const k = titleKey(t);
    if (excluded.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
