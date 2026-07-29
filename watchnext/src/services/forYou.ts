import type { MediaType, Title } from "../types/tmdb";
import type { WatchlistEntry } from "../types/db";
import { getGenres, getTitleDetails, discoverSuggestions, getTrending } from "./tmdb";
import { getCachedBatch, cacheTitle, type CachedMeta } from "./titleCache";
import { getFriends } from "./friends";
import { getLibrary } from "./watchlist";
import { getHiddenTitles } from "./hiddenRecs";
import { computeTasteMatch } from "../lib/tasteMatchLogic";
import { titleKey, selectWeightedSeeds } from "../lib/forYouLogic";
import {
  buildGenreProfile,
  rankHybrid,
  contentScore,
  collaborativeWeight,
  blendExploration,
  learnLanguages,
  dominantLanguage,
  filterByLanguage,
  type GenreTitle,
  type Neighbor,
} from "../lib/recommendEngine";
import { DEFAULT_REC_WEIGHTS, type RecWeights } from "../lib/recPrefs";

const PROFILE_SEEDS = 200; // shape the genre profile from your WHOLE library (high cap is just a safety bound)
const TOP_GENRES = 3; // discover candidates from this many of your strongest genres
const MAX = 15;
const MIN_VOTES = 200; // popularity floor — drop obscure random titles
const MIN_CONTENT = 0.08; // minimum taste-match for a candidate to qualify (once you have a profile)
const EXPLORE_GENRES = 2; // discover a few "stretch" picks from genres just outside your core
const EXPLORE_SLOTS = 2; // how many exploration picks to weave into the final rail

type SeedMeta = { genreIds: number[]; language: string | null };

// Session memo: a title's genres + language never change, so we fetch once.
const metaMemo = new Map<string, SeedMeta>();

async function metaFor(
  mediaType: MediaType,
  tmdbId: number,
  nameToId: Map<string, number>,
  cacheMap: Map<number, CachedMeta>,
): Promise<SeedMeta> {
  const key = titleKey({ mediaType, tmdbId });
  const memo = metaMemo.get(key);
  if (memo) return memo;
  const toIds = (names: string[]): number[] =>
    names.map((name) => nameToId.get(name)).filter((id): id is number => typeof id === "number");

  // 1) Shared DB cache — no API call. This is what keeps rec-engine API usage low.
  const dbc = cacheMap.get(tmdbId);
  if (dbc) {
    const meta: SeedMeta = { genreIds: toIds(dbc.genres), language: dbc.originalLanguage };
    metaMemo.set(key, meta);
    return meta;
  }
  // 2) Miss → data API, then populate the cache for everyone.
  try {
    const detail = await getTitleDetails(mediaType, tmdbId);
    cacheTitle(mediaType, tmdbId, detail);
    const meta: SeedMeta = { genreIds: toIds(detail.genres), language: detail.originalLanguage ?? null };
    metaMemo.set(key, meta);
    return meta;
  } catch {
    return { genreIds: [], language: null };
  }
}

function seedMeta(
  entry: WatchlistEntry,
  nameToId: Map<string, number>,
  cacheMap: Map<number, CachedMeta>,
): Promise<SeedMeta> {
  return metaFor(entry.media_type, entry.tmdb_id, nameToId, cacheMap);
}

// Build the "Movies/Shows for you" list with OUR hybrid engine — content (genre
// taste) + collaborative (friends like you) + a trending nudge — no TMDB
// "more like this" call. `library` is the viewer's full library (passed in so
// the rail can key its cache on it).
export async function getForYou(
  mediaType: MediaType,
  library: WatchlistEntry[],
  recWeights: RecWeights = DEFAULT_REC_WEIGHTS,
  providerIds: number[] = [], // the user's streaming services — recs are restricted to these
): Promise<Title[]> {
  const mine = library.filter((e) => e.media_type === mediaType);
  // Exclude everything already in the library AND anything marked "Not interested",
  // so hidden titles never come back and a replacement backfills in their place.
  const hiddenTitles = await getHiddenTitles().catch(() => []);
  const excludeKeys = new Set<string>([
    ...library.map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })),
    ...hiddenTitles.map((h) => titleKey(h)),
  ]);

  // 1) Genre taste profile from your top-weighted titles.
  const genreList = await getGenres(mediaType).catch(() => []);
  const nameToId = new Map(genreList.map((g) => [g.name, g.id]));
  const seeds = selectWeightedSeeds(mine, mediaType, PROFILE_SEEDS);

  // Pull cached genres for every seed + disliked title in ONE query, so the genre
  // profile is built from our own DB instead of a data-API call per title.
  const hiddenThisType = hiddenTitles.filter((h) => h.mediaType === mediaType);
  const cacheIds = [...new Set([...seeds.map((s) => s.entry.tmdb_id), ...hiddenThisType.map((h) => h.tmdbId)])];
  const cacheMap = await getCachedBatch(mediaType, cacheIds);

  const genresByKey = new Map<string, number[]>();
  const seedLangs: (string | null)[] = [];
  await Promise.all(
    seeds.map(async (s) => {
      const meta = await seedMeta(s.entry, nameToId, cacheMap);
      genresByKey.set(titleKey({ mediaType: s.entry.media_type, tmdbId: s.entry.tmdb_id }), meta.genreIds);
      seedLangs.push(meta.language);
    })
  );
  const profile = buildGenreProfile(mine, genresByKey);

  // Dislike profile: genres of titles you've marked "Not interested" (this media
  // type), counted so repeatedly rejecting a genre suppresses it more over time.
  const dislike = new Map<number, number>();
  await Promise.all(
    hiddenThisType.map(async (h) => {
      const meta = await metaFor(mediaType, h.tmdbId, nameToId, cacheMap);
      for (const g of meta.genreIds) dislike.set(g, (dislike.get(g) ?? 0) + 1);
    })
  );

  // Languages this user actually watches — used to drop foreign-language randoms.
  const allowedLangs = learnLanguages(seedLangs);
  const dominant = dominantLanguage(seedLangs);

  // 2) Candidate pool: discover by your strongest genres (+ trending fallback).
  const sortedGenres = [...profile.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  const topGenres = sortedGenres.slice(0, TOP_GENRES);
  // Exploration genres: the next-strongest genres just OUTSIDE your core — a
  // "slight stretch", not random, so diversity picks are still plausibly you.
  const exploreGenres = sortedGenres.slice(TOP_GENRES, TOP_GENRES + EXPLORE_GENRES);

  const discoverFor = (g: number) =>
    discoverSuggestions({
      mediaType,
      genreId: g,
      originalLanguage: dominant, // richer pool in your main language
      minVotes: MIN_VOTES, // popularity floor
      providerIds, // only surface titles on the user's services (empty = no filter)
    }).catch(() => [] as GenreTitle[]);

  const [discoverLists, exploreLists, trendingAll] = await Promise.all([
    Promise.all((topGenres.length ? topGenres : [null]).map((g) => (g == null ? Promise.resolve([] as GenreTitle[]) : discoverFor(g)))),
    Promise.all(exploreGenres.map(discoverFor)),
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

  // Exploration candidates (from genres just outside your core) — kept separate so
  // a couple can be woven into the final list for variety.
  const exploreCandidates: GenreTitle[] = filterByLanguage(exploreLists.flat(), allowedLangs);

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

  const core = rankHybrid({ candidates, profile, neighbors, trendingKeys, weights, excludeKeys, dislike });
  // Rank the exploration pool the same way, then weave a couple of those "stretch"
  // picks into the mostly-core list so the rail isn't the same genres every time.
  const explore = rankHybrid({
    candidates: exploreCandidates,
    profile,
    neighbors,
    trendingKeys,
    weights,
    excludeKeys,
    dislike,
  });
  // How many "stretch" picks to weave in is user-steerable (the Discovery dial).
  const exploreSlots = Math.max(0, Math.min(Math.round(recWeights.discovery ?? EXPLORE_SLOTS), MAX));
  return blendExploration(core, explore, { exploreSlots, total: MAX });
}
