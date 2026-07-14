import type { WatchlistEntry } from "../types/db";
import type { Title } from "../types/tmdb";
import type { RecWeights } from "../lib/recPrefs";
import { getForYou } from "./forYou";
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

// A deck for the swipe screen: your personalized For-You picks first (movies +
// shows interleaved), then a deeper pool of recognizable titles so you never run
// dry. Excludes anything already in your library.
export async function getSwipeDeck(library: WatchlistEntry[], recWeights?: RecWeights): Promise<Title[]> {
  const [m, tv, pm, ptv] = await Promise.all([
    getForYou("movie", library, recWeights).catch(() => [] as Title[]),
    getForYou("tv", library, recWeights).catch(() => [] as Title[]),
    discoverTitles({ mediaType: "movie", sortBy: "vote_count.desc", minVotes: 500, page: 1 })
      .then((p) => p.results)
      .catch(() => [] as Title[]),
    discoverTitles({ mediaType: "tv", sortBy: "vote_count.desc", minVotes: 500, page: 1 })
      .then((p) => p.results)
      .catch(() => [] as Title[]),
  ]);

  const excluded = new Set(library.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })));
  const seen = new Set<string>();
  const out: Title[] = [];
  for (const t of [...interleave(m, tv), ...interleave(pm, ptv)]) {
    const k = titleKey(t);
    if (excluded.has(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}
