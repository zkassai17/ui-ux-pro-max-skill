import type { MediaType, Title } from "../types/tmdb";
import type { WatchlistEntry } from "../types/db";
import { getGenres, getTitleDetails, discoverSuggestions, getTrending } from "./tmdb";
import { getFriends } from "./friends";
import { getLibrary } from "./watchlist";
import { getHiddenKeys } from "./hiddenRecs";
import { computeTasteMatch } from "../lib/tasteMatchLogic";
import { titleKey, selectWeightedSeeds } from "../lib/forYouLogic";
import {
  buildGenreProfile,
  rankHybrid,
  contentScore,
  collaborativeWeight,
  learnLanguages,
  dominantLanguage,
  filterByLanguage,
  type GenreTitle,
  type Neighbor,
} from "../lib/recommendEngine";
import { DEFAULT_REC_WEIGHTS, type RecWeights } from "../lib/recPrefs";

const PROFILE_SEEDS = 12; // how many top-weighted library titles shape the genre profile
const TOP_GENRES = 3; // discover candidates from this many of your strongest genres
const MAX = 15;
const MIN_VOTES = 200; // popularity floor — drop obscure random titles
const MIN_CONTENT = 0.08; // minimum taste-match for a candidate to qualify (once you have a profile)

type SeedMeta = { genreIds: number[]; language: string | null };

// Session memo: a title's genres + language never change, so we fetch once.
const metaMemo = new Map<string, SeedMeta>();

async function seedMeta(entry: WatchlistEntry, nameToId: Map<string, number>): Promise<SeedMeta> {
  const key = titleKey({ mediaType: entry.media_type, tmdbId: entry.tmdb_id });
  const cached = metaMemo.get(key);
  if (cached) return cached;
  try {
    const detail = await getTitleDetails(entry.media_type, entry.tmdb_id);
    const genreIds = detail.genres
      .map((name) => nameToId.get(name))
      .filter((id): id is number => typeof id === "number");
    const meta: SeedMeta = { genreIds, language: detail.originalLanguage ?? null };
    metaMemo.set(key, meta);
    return meta;
  } catch {
    return { genreIds: [], language: null };
  }
}

// Build the "Movies/Shows for you" list with OUR hybrid engine — content (genre
// taste) + collaborative (friends like you) + a trending nudge — no TMDB
// "more like this" call. `library` is the viewer's full library (passed in so
// the rail can key its cache on it).
export async function getForYou(
  mediaType: MediaType,
  library: WatchlistEntry[],
  recWeights: RecWeights = DEFAULT_REC_WEIGHTS,
): Promise<Title[]> {
  const mine = library.filter((e) => e.media_type === mediaType);
  // Exclude everything already in the library AND anything marked "Not interested",
  // so hidden titles never come back and a replacement backfills in their place.
  const hidden = await getHiddenKeys().catch(() => new Set<string>());
  const excludeKeys = new Set<string>([
    ...library.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })),
    ...hidden,
  ]);

  // 1) Genre taste profile from your top-weighted titles.
  const genreList = await getGenres(mediaType).catch(() => []);
  const nameToId = new Map(genreList.map((g) => [g.name, g.id]));
  const seeds = selectWeightedSeeds(mine, mediaType, PROFILE_SEEDS);
  const genresByKey = new Map<string, number[]>();
  const seedLangs: (string | null)[] = [];
  await Promise.all(
    seeds.map(async (s) => {
      const meta = await seedMeta(s.entry, nameToId);
      genresByKey.set(titleKey({ mediaType: s.entry.media_type, tmdbId: s.entry.tmdb_id }), meta.genreIds);
      seedLangs.push(meta.language);
    })
  );
  const profile = buildGenreProfile(mine, genresByKey);

  // Languages this user actually watches — used to drop foreign-language randoms.
  const allowedLangs = learnLanguages(seedLangs);
  const dominant = dominantLanguage(seedLangs);

  // 2) Candidate pool: discover by your strongest genres (+ trending fallback).
  const topGenres = [...profile.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_GENRES)
    .map(([id]) => id);

  const [discoverLists, trendingAll] = await Promise.all([
    Promise.all(
      (topGenres.length ? topGenres : [null]).map((g) =>
        g == null
          ? Promise.resolve([] as GenreTitle[])
          : discoverSuggestions({
              mediaType,
              genreId: g,
              originalLanguage: dominant, // richer pool in your main language
              minVotes: MIN_VOTES, // popularity floor
            }).catch(() => [] as GenreTitle[])
      )
    ),
    getTrending().catch(() => [] as Title[]),
  ]);
  const trendingForType = trendingAll.filter((t) => t.mediaType === mediaType);
  const trendingKeys = new Set(trendingForType.map((t) => titleKey(t)));

  // Once we know your taste (non-empty profile), keep the pool ON-GENRE: generic
  // trending fillers (no genre overlap) are only mixed in at cold start.
  const hasProfile = profile.size > 0;
  const pooled: GenreTitle[] = filterByLanguage(
    [
      ...discoverLists.flat(),
      // trending titles carry no genre ids — only useful before we know your taste
      ...(hasProfile ? [] : trendingForType.map((t) => ({ ...t, genreIds: [] as number[] }))),
    ],
    allowedLangs,
  );

  // Tighter matching: drop candidates that barely graze your taste — but only when
  // enough strong matches remain, so the rail never starves.
  const strong = pooled.filter((c) => contentScore(c.genreIds, profile) >= MIN_CONTENT);
  const candidates: GenreTitle[] = hasProfile && strong.length >= MAX ? strong : pooled;

  // 3) Collaborative signal from friends, weighted by taste-match.
  const neighbors: Neighbor[] = [];
  try {
    const friends = await getFriends();
    const friendLibs = await Promise.all(friends.map((f) => getLibrary(f.id).catch(() => [])));
    friends.forEach((_, i) => {
      const lib = friendLibs[i];
      const match = computeTasteMatch(library, lib);
      if (match.score == null) return;
      const likedKeys = new Set(
        lib
          .filter((en) => en.status === "watched")
          .map((en) => titleKey({ mediaType: en.media_type, tmdbId: en.tmdb_id }))
      );
      if (likedKeys.size === 0) return;
      neighbors.push({ affinity: match.score / 100, likedKeys });
    });
  } catch {
    // friends are a bonus signal — never block the rail on them
  }

  // User-steered weights: content + trending used directly; the collaborative
  // weight is the user's chosen amount ramped by how many usable neighbors exist.
  const weights = {
    content: recWeights.content,
    collaborative: collaborativeWeight(neighbors.length, recWeights.collaborative),
    trending: recWeights.trending,
  };

  return rankHybrid({ candidates, profile, neighbors, trendingKeys, weights, excludeKeys }).slice(0, MAX);
}
