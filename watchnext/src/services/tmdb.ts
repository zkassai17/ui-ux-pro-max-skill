import type { MediaType, Title, TitleDetail, Genre, WatchProviders } from "../types/tmdb";
import {
  normalizeSearchResults,
  normalizeDetail,
  normalizeDiscoverResults,
  normalizeGenres,
  normalizeWatchProviders,
} from "../lib/tmdbNormalize";
import { WATCH_REGION } from "../lib/providers";

const TMDB_BASE = "https://api.themoviedb.org/3";

function authHeaders(): Record<string, string> {
  const token = process.env.EXPO_PUBLIC_TMDB_TOKEN;
  if (!token) throw new Error("TMDB not configured");
  return { Authorization: `Bearer ${token}`, accept: "application/json" };
}

async function tmdbGet(path: string): Promise<any> {
  const headers = authHeaders(); // throws before fetch if unconfigured
  const res = await fetch(`${TMDB_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`);
  return res.json();
}

export async function searchTitles(query: string): Promise<Title[]> {
  const q = query.trim();
  if (!q) return [];
  const raw = await tmdbGet(`/search/multi?include_adult=false&query=${encodeURIComponent(q)}`);
  return normalizeSearchResults(raw);
}

export async function getTrending(): Promise<Title[]> {
  const raw = await tmdbGet(`/trending/all/week`);
  return normalizeSearchResults(raw);
}

export async function getTitleDetails(mediaType: MediaType, id: number): Promise<TitleDetail> {
  const raw = await tmdbGet(`/${mediaType}/${id}`);
  return normalizeDetail(raw, mediaType);
}

export async function getGenres(mediaType: MediaType): Promise<Genre[]> {
  const raw = await tmdbGet(`/genre/${mediaType}/list`);
  return normalizeGenres(raw);
}

export async function discoverTitles(opts: {
  mediaType: MediaType;
  genreId?: number | null;
  providerId?: number | null;
}): Promise<Title[]> {
  const params = new URLSearchParams({
    include_adult: "false",
    sort_by: "popularity.desc",
    watch_region: WATCH_REGION,
  });
  if (opts.genreId) params.set("with_genres", String(opts.genreId));
  if (opts.providerId) params.set("with_watch_providers", String(opts.providerId));
  const raw = await tmdbGet(`/discover/${opts.mediaType}?${params.toString()}`);
  return normalizeDiscoverResults(raw, opts.mediaType);
}

export async function getWatchProviders(mediaType: MediaType, id: number): Promise<WatchProviders> {
  const raw = await tmdbGet(`/${mediaType}/${id}/watch/providers`);
  return normalizeWatchProviders(raw, WATCH_REGION);
}
