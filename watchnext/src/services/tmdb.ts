import type { MediaType, Title, TitleDetail } from "../types/tmdb";
import { normalizeSearchResults, normalizeDetail } from "../lib/tmdbNormalize";

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
