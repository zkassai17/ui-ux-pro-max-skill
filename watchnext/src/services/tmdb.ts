import type { MediaType, Title, Suggestion, TitleDetail, Genre, WatchProviders } from "../types/tmdb";
import {
  normalizeSearchResults,
  normalizeDetail,
  normalizeDiscoverResults,
  normalizeGenres,
  normalizeWatchProviders,
  normalizeSuggestions,
} from "../lib/tmdbNormalize";
import { WATCH_REGION } from "../lib/providers";
import { relaxQueries, rankByFuzzy } from "../lib/searchLogic";
import type { Lang } from "../i18n/translations";

const TMDB_BASE = "https://api.themoviedb.org/3";

// TMDB locale for content (titles, overviews, genre names). Updated by the i18n
// provider when the app language changes; defaults to English.
const TMDB_LOCALE: Record<Lang, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  he: "he-IL",
  ar: "ar-SA",
};
let apiLanguage = "en-US";

export function setApiLanguage(lang: Lang): void {
  apiLanguage = TMDB_LOCALE[lang] ?? "en-US";
}

function authHeaders(): Record<string, string> {
  const token = process.env.EXPO_PUBLIC_TMDB_TOKEN;
  if (!token) throw new Error("TMDB not configured");
  return { Authorization: `Bearer ${token}`, accept: "application/json" };
}

async function tmdbGet(path: string): Promise<any> {
  const headers = authHeaders(); // throws before fetch if unconfigured
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${TMDB_BASE}${path}${sep}language=${apiLanguage}`, { headers });
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`);
  return res.json();
}

async function fetchSearch(query: string): Promise<Title[]> {
  const raw = await tmdbGet(`/search/multi?include_adult=false&query=${encodeURIComponent(query)}`);
  return normalizeSearchResults(raw);
}

export async function searchTitles(query: string): Promise<Title[]> {
  const q = query.trim();
  if (!q) return [];
  const exact = await fetchSearch(q);
  if (exact.length > 0) return exact;
  // No exact hits — retry relaxed queries (typo leeway), merge, and fuzzy-rank.
  const candidates = relaxQueries(q);
  if (candidates.length === 0) return exact;
  const lists = await Promise.all(candidates.map(fetchSearch));
  const seen = new Set<string>();
  const merged = lists.flat().filter((t) => {
    const key = `${t.mediaType}:${t.tmdbId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return rankByFuzzy(q, merged, 0.34);
}

export async function getTrending(): Promise<Title[]> {
  const raw = await tmdbGet(`/trending/all/week`);
  return normalizeSearchResults(raw);
}

// Paginated trending feed of movies + shows mixed together, for the Add screen's
// "Trending" chip. TMDB's /trending endpoint can't filter by streaming provider,
// so when providers are selected we fall back to "most popular on those services"
// (popularity-sorted discover across both media types, interleaved).
export async function getTrendingTitles(opts: {
  providerIds?: number[];
  page?: number;
}): Promise<DiscoverPage> {
  const page = opts.page ?? 1;
  if (!opts.providerIds?.length) {
    const raw = await tmdbGet(`/trending/all/week?page=${page}`);
    return {
      results: normalizeSearchResults(raw),
      page: typeof raw?.page === "number" ? raw.page : 1,
      totalPages: typeof raw?.total_pages === "number" ? raw.total_pages : 1,
    };
  }
  const [movies, shows] = await Promise.all([
    discoverTitles({ mediaType: "movie", providerIds: opts.providerIds, page }),
    discoverTitles({ mediaType: "tv", providerIds: opts.providerIds, page }),
  ]);
  const results: Title[] = [];
  const max = Math.max(movies.results.length, shows.results.length);
  for (let i = 0; i < max; i++) {
    if (movies.results[i]) results.push(movies.results[i]);
    if (shows.results[i]) results.push(shows.results[i]);
  }
  return { results, page, totalPages: Math.max(movies.totalPages, shows.totalPages) };
}

export async function getTitleDetails(mediaType: MediaType, id: number): Promise<TitleDetail> {
  const raw = await tmdbGet(`/${mediaType}/${id}`);
  return normalizeDetail(raw, mediaType);
}

export async function getGenres(mediaType: MediaType): Promise<Genre[]> {
  const raw = await tmdbGet(`/genre/${mediaType}/list`);
  return normalizeGenres(raw);
}

export type DiscoverPage = { results: Title[]; page: number; totalPages: number };

export async function discoverTitles(opts: {
  mediaType: MediaType;
  genreIds?: number[];
  providerIds?: number[];
  page?: number;
}): Promise<DiscoverPage> {
  const params = new URLSearchParams({
    include_adult: "false",
    sort_by: "popularity.desc",
    watch_region: WATCH_REGION,
    page: String(opts.page ?? 1),
  });
  // "|" = OR: titles in ANY selected genre, available on ANY selected provider.
  if (opts.genreIds?.length) params.set("with_genres", opts.genreIds.join("|"));
  if (opts.providerIds?.length) params.set("with_watch_providers", opts.providerIds.join("|"));
  const raw = await tmdbGet(`/discover/${opts.mediaType}?${params.toString()}`);
  return {
    results: normalizeDiscoverResults(raw, opts.mediaType),
    page: typeof raw?.page === "number" ? raw.page : 1,
    totalPages: typeof raw?.total_pages === "number" ? raw.total_pages : 1,
  };
}

// Like discoverTitles but keeps each result's genre ids — our own recommendation
// engine needs them to content-score candidates.
export async function discoverSuggestions(opts: {
  mediaType: MediaType;
  genreId?: number | null;
  originalLanguage?: string | null; // restrict to one language at the source for a richer pool
  minVotes?: number; // drop obscure titles below this vote count
  page?: number;
}): Promise<Suggestion[]> {
  const params = new URLSearchParams({
    include_adult: "false",
    sort_by: "popularity.desc",
    watch_region: WATCH_REGION,
    page: String(opts.page ?? 1),
  });
  if (opts.genreId) params.set("with_genres", String(opts.genreId));
  if (opts.originalLanguage) params.set("with_original_language", opts.originalLanguage);
  if (opts.minVotes) params.set("vote_count.gte", String(opts.minVotes));
  const raw = await tmdbGet(`/discover/${opts.mediaType}?${params.toString()}`);
  return normalizeSuggestions(raw, opts.mediaType);
}

export async function getWatchProviders(mediaType: MediaType, id: number): Promise<WatchProviders> {
  const raw = await tmdbGet(`/${mediaType}/${id}/watch/providers`);
  return normalizeWatchProviders(raw, WATCH_REGION);
}

export async function getRecommendations(mediaType: MediaType, id: number): Promise<Title[]> {
  const raw = await tmdbGet(`/${mediaType}/${id}/recommendations`);
  return normalizeDiscoverResults(raw, mediaType);
}

export async function getGroupRecommendations(mediaType: MediaType, id: number): Promise<Suggestion[]> {
  const raw = await tmdbGet(`/${mediaType}/${id}/recommendations`);
  return normalizeSuggestions(raw, mediaType);
}
