import { supabase } from "./supabase";
import { getTitleDetails } from "./tmdb";
import type { MediaType, TitleDetail } from "../types/tmdb";

// A shared cache of stable title metadata (genres, overview, poster, year, rating)
// in our own Postgres. Stable data never changes, so once a title is cached the
// app reads it from our DB instead of paying the data API for it again — the main
// lever that keeps external-API usage (and cost) low regardless of provider.
//
// NOTE: this deliberately does NOT cache watch-provider ("where to watch") data,
// which changes over time and is handled separately with a short client cache.

export type CachedMeta = {
  title: string;
  year: string | null;
  posterPath: string | null;
  rating: number | null;
  overview: string;
  genres: string[];
  originalLanguage: string | null;
};

// Fire-and-forget write. Best-effort: a failed cache write must never break a read.
export function cacheTitle(mediaType: MediaType, tmdbId: number, d: TitleDetail): void {
  supabase
    .from("title_cache")
    .upsert(
      {
        media_type: mediaType,
        tmdb_id: tmdbId,
        title: d.title,
        year: d.year,
        poster_path: d.posterPath,
        rating: d.rating,
        overview: d.overview,
        genres: d.genres,
        original_language: d.originalLanguage ?? null,
      },
      { onConflict: "media_type,tmdb_id" },
    )
    .then(
      () => {},
      () => {},
    );
}

// Batch-read cached metadata for many titles of one media type in a SINGLE query
// (the rec engine needs genres for dozens of titles — this is one DB round trip
// instead of dozens of API calls). Misses are simply absent from the map.
export async function getCachedBatch(mediaType: MediaType, ids: number[]): Promise<Map<number, CachedMeta>> {
  const out = new Map<number, CachedMeta>();
  if (!ids.length) return out;
  const { data, error } = await supabase
    .from("title_cache")
    .select("tmdb_id, title, year, poster_path, rating, overview, genres, original_language")
    .eq("media_type", mediaType)
    .in("tmdb_id", ids);
  if (error || !data) return out;
  for (const r of data as any[]) {
    out.set(r.tmdb_id as number, {
      title: r.title,
      year: r.year,
      posterPath: r.poster_path,
      rating: r.rating,
      overview: r.overview ?? "",
      genres: (r.genres ?? []) as string[],
      originalLanguage: r.original_language ?? null,
    });
  }
  return out;
}

// Single title: read from the cache first, fall back to the data API on a miss
// (and populate the cache for next time). Use this everywhere a title's details
// are shown, so repeat views are free.
export async function getTitleDetailsCached(mediaType: MediaType, tmdbId: number): Promise<TitleDetail> {
  const cached = (await getCachedBatch(mediaType, [tmdbId])).get(tmdbId);
  if (cached) {
    return {
      tmdbId,
      mediaType,
      title: cached.title,
      year: cached.year,
      posterPath: cached.posterPath,
      rating: cached.rating,
      overview: cached.overview,
      genres: cached.genres,
      originalLanguage: cached.originalLanguage,
    };
  }
  const detail = await getTitleDetails(mediaType, tmdbId);
  cacheTitle(mediaType, tmdbId, detail);
  return detail;
}
