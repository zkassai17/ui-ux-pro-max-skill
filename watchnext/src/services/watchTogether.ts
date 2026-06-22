import type { MediaType, Suggestion, Title } from "../types/tmdb";
import type { WatchlistEntry } from "../types/db";
import { getLibrary } from "./watchlist";
import { getHiddenTitles, type HiddenTitle } from "./hiddenRecs";
import { getGenres, getTitleDetails, discoverSuggestions, getTrending } from "./tmdb";
import { groupPicks, type GroupPick } from "../lib/watchTogetherLogic";
import { titleKey, selectWeightedSeeds } from "../lib/forYouLogic";
import {
  buildGenreProfile,
  rankHybrid,
  learnLanguages,
  dominantLanguage,
  filterByLanguage,
} from "../lib/recommendEngine";

// Suggestions use a GROUP version of the For You hybrid engine instead of TMDB
// "more like this": we build one combined genre-taste profile from (nearly) all
// of every member's library — weighted by status + a light rating nudge
// (seedWeight) so genres the group collectively loves dominate — then discover
// candidates in those genres, filtered to the languages the group watches and
// above a popularity floor, with a small trending nudge. Titles anyone already
// has are excluded (everyone watches something new together).
const SEEDS_PER_PERSON = 25; // ~all of each member's titles shape the group's taste
const TOP_GENRES = 3; // discover from this many of the group's strongest genres
const MIN_VOTES = 150; // popularity floor — drop obscure random titles
const MAX = 20;

export type WatchTogetherResult = {
  picks: GroupPick[];
  suggestions: Suggestion[];
};

type SeedMeta = { genreIds: number[]; language: string | null };

// Session memo: a title's genres + language never change, so we fetch once.
const metaMemo = new Map<string, SeedMeta>();

async function metaFor(
  mediaType: MediaType,
  tmdbId: number,
  nameToId: Map<string, number>,
): Promise<SeedMeta> {
  const key = titleKey({ mediaType, tmdbId });
  const cached = metaMemo.get(key);
  if (cached) return cached;
  try {
    const detail = await getTitleDetails(mediaType, tmdbId);
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

function seedMeta(entry: WatchlistEntry, nameToId: Map<string, number>): Promise<SeedMeta> {
  return metaFor(entry.media_type, entry.tmdb_id, nameToId);
}

// Hybrid group suggestions for one media type. Returns ranked Suggestions
// (genreIds preserved so the results screen can genre-filter them).
async function suggestForMedia(
  mediaType: MediaType,
  libraries: WatchlistEntry[][],
  excludeKeys: Set<string>,
  hiddenTitles: HiddenTitle[],
): Promise<Suggestion[]> {
  const genreList = await getGenres(mediaType).catch(() => []);
  const nameToId = new Map(genreList.map((g) => [g.name, g.id]));

  // Seed from (nearly) every member's titles of this type, strongest-taste first.
  const seeds = libraries.flatMap((lib) => selectWeightedSeeds(lib, mediaType, SEEDS_PER_PERSON));
  if (seeds.length === 0) return [];

  const genresByKey = new Map<string, number[]>();
  const seedLangs: (string | null)[] = [];
  await Promise.all(
    seeds.map(async (s) => {
      const meta = await seedMeta(s.entry, nameToId);
      genresByKey.set(titleKey({ mediaType: s.entry.media_type, tmdbId: s.entry.tmdb_id }), meta.genreIds);
      seedLangs.push(meta.language);
    })
  );

  // Combined group profile — seedWeight inside folds in status + a light rating nudge.
  const profile = buildGenreProfile(seeds.map((s) => s.entry), genresByKey);
  const allowedLangs = learnLanguages(seedLangs);
  const dominant = dominantLanguage(seedLangs);

  // Dislike profile from your "Not interested" dismissals (this media type), so
  // the group picks learn what you keep rejecting.
  const dislike = new Map<number, number>();
  await Promise.all(
    hiddenTitles
      .filter((h) => h.mediaType === mediaType)
      .map(async (h) => {
        const meta = await metaFor(mediaType, h.tmdbId, nameToId);
        for (const g of meta.genreIds) dislike.set(g, (dislike.get(g) ?? 0) + 1);
      })
  );

  const topGenres = [...profile.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_GENRES)
    .map(([id]) => id);

  const [discoverLists, trendingAll] = await Promise.all([
    Promise.all(
      (topGenres.length ? topGenres : [null]).map((g) =>
        g == null
          ? Promise.resolve([] as Suggestion[])
          : discoverSuggestions({
              mediaType,
              genreId: g,
              originalLanguage: dominant,
              minVotes: MIN_VOTES,
            }).catch(() => [] as Suggestion[])
      )
    ),
    getTrending().catch(() => [] as Title[]),
  ]);
  const trendingForType = trendingAll.filter((t) => t.mediaType === mediaType);
  const trendingKeys = new Set(trendingForType.map((t) => titleKey(t)));

  const candidates: Suggestion[] = filterByLanguage(
    [...discoverLists.flat(), ...trendingForType.map((t) => ({ ...t, genreIds: [] as number[] }))],
    allowedLangs,
  );
  const candByKey = new Map(candidates.map((c) => [titleKey(c), c]));

  const ranked = rankHybrid({
    candidates,
    profile,
    neighbors: [], // group taste lives in the combined profile; candidates are new-to-all
    trendingKeys,
    weights: { content: 1, collaborative: 0, trending: 0.25 },
    excludeKeys,
    dislike,
  });

  // rankHybrid types results as Title; map back to the original Suggestions to keep genreIds.
  return ranked
    .map((t) => candByKey.get(titleKey(t)))
    .filter((s): s is Suggestion => !!s);
}

export async function getWatchTogether(friendIds: string[]): Promise<WatchTogetherResult> {
  const libraries = await Promise.all([getLibrary(), ...friendIds.map((id) => getLibrary(id))]);

  const picks = groupPicks(libraries);
  const hiddenTitles = await getHiddenTitles().catch(() => []);
  const excludeKeys = new Set([
    ...libraries.flat().map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id })),
    ...hiddenTitles.map((h) => titleKey(h)),
  ]);

  const [movieSugg, tvSugg] = await Promise.all([
    suggestForMedia("movie", libraries, excludeKeys, hiddenTitles),
    suggestForMedia("tv", libraries, excludeKeys, hiddenTitles),
  ]);

  // Interleave movies + shows so both are represented, capped at MAX.
  const suggestions: Suggestion[] = [];
  const maxLen = Math.max(movieSugg.length, tvSugg.length);
  for (let i = 0; i < maxLen && suggestions.length < MAX; i++) {
    if (movieSugg[i]) suggestions.push(movieSugg[i]);
    if (tvSugg[i]) suggestions.push(tvSugg[i]);
  }

  return { picks, suggestions };
}
