import { getLibrary } from "./watchlist";
import { getGroupRecommendations } from "./tmdb";
import { sharedWantToWatch, rankSuggestions } from "../lib/watchTogetherLogic";
import { titleKey } from "../lib/forYouLogic";
import type { WatchlistEntry } from "../types/db";
import type { Suggestion } from "../types/tmdb";

// How many recent watched titles per person seed the TMDB suggestion engine.
// Caps total TMDB calls at SEEDS_PER_PERSON * (group size, max 4).
const SEEDS_PER_PERSON = 6;

export type WatchTogetherResult = {
  shared: WatchlistEntry[];
  suggestions: Suggestion[];
};

export async function getWatchTogether(friendIds: string[]): Promise<WatchTogetherResult> {
  const libraries = await Promise.all([getLibrary(), ...friendIds.map((id) => getLibrary(id))]);

  const shared = sharedWantToWatch(libraries);

  const excludeKeys = new Set(
    libraries.flat().map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id }))
  );

  // getLibrary returns rows ordered by added_at desc, so the first watched
  // entries are the most recent.
  const candidatesByPerson = await Promise.all(
    libraries.map(async (lib) => {
      const seeds = lib.filter((e) => e.status === "watched").slice(0, SEEDS_PER_PERSON);
      const lists = await Promise.all(
        seeds.map((s) => getGroupRecommendations(s.media_type, s.tmdb_id).catch(() => [] as Suggestion[]))
      );
      return lists.flat();
    })
  );

  const suggestions = rankSuggestions(candidatesByPerson, excludeKeys);
  return { shared, suggestions };
}
