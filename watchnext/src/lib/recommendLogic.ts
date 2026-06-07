import type { Recommendation, WatchlistEntry } from "../types/db";

export type WatchlistInsert = Pick<
  WatchlistEntry,
  "user_id" | "tmdb_id" | "media_type" | "title" | "poster_path" | "status"
>;

export function recToWatchlistInsert(rec: Recommendation, userId: string): WatchlistInsert {
  return {
    user_id: userId,
    tmdb_id: rec.tmdb_id,
    media_type: rec.media_type,
    title: rec.title,
    poster_path: rec.poster_path,
    status: "want",
  };
}
