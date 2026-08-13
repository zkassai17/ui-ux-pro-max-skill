// The app's single movie/TV data-access point.
//
// EVERYTHING that needs catalog data (search, browse, details, where-to-watch,
// genres, recommendations) imports from HERE — never from a specific provider.
// Today this is backed by TMDB (tmdb.ts) with a shared DB metadata cache
// (titleCache.ts).
//
// To move to a cheaper data provider later, reimplement the functions in tmdb.ts
// (or repoint these re-exports at a new provider module) that return the same
// shapes. This file is the seam, so nothing else in the app has to change — the
// swap is localized here.

export {
  setApiLanguage,
  searchTitles,
  getTrending,
  getTrendingTitles,
  getGenres,
  discoverTitles,
  discoverSuggestions,
  getWatchProviders,
  getRecommendations,
  getGroupRecommendations,
  // Raw (uncached) details — used only inside the cache's miss path.
  getTitleDetails,
  type TrendingScope,
  type DiscoverPage,
} from "./tmdb";

// Cache-backed helpers — DB-first, so repeat lookups don't hit the provider.
export { getTitleDetailsCached, getCachedBatch, cacheTitle, type CachedMeta } from "./titleCache";
