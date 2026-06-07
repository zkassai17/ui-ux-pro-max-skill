import type { MediaType, Title, TitleDetail } from "../types/tmdb";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null, size = "w500"): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

function yearFrom(date: string | null | undefined): string | null {
  if (!date) return null;
  const y = date.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

function roundRating(v: number | null | undefined): number | null {
  if (v === null || v === undefined || v === 0) return null;
  return Math.round(v * 10) / 10;
}

export function normalizeSearchItem(raw: any): Title | null {
  const mediaType = raw?.media_type as MediaType;
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  const name = mediaType === "movie" ? raw.title : raw.name;
  if (!name) return null;
  const date = mediaType === "movie" ? raw.release_date : raw.first_air_date;
  return {
    tmdbId: raw.id,
    mediaType,
    title: name,
    year: yearFrom(date),
    posterPath: raw.poster_path ?? null,
    rating: roundRating(raw.vote_average),
  };
}

export function normalizeSearchResults(raw: any): Title[] {
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return results
    .map(normalizeSearchItem)
    .filter((t: Title | null): t is Title => t !== null);
}

export function normalizeDetail(raw: any, mediaType: MediaType): TitleDetail {
  const name = mediaType === "movie" ? raw.title : raw.name;
  const date = mediaType === "movie" ? raw.release_date : raw.first_air_date;
  return {
    tmdbId: raw.id,
    mediaType,
    title: name,
    year: yearFrom(date),
    posterPath: raw.poster_path ?? null,
    rating: roundRating(raw.vote_average),
    overview: raw.overview ?? "",
    genres: Array.isArray(raw.genres) ? raw.genres.map((g: any) => g.name) : [],
  };
}
