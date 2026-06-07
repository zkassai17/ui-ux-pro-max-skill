import { supabase } from "./supabase";
import type { Title, MediaType } from "../types/tmdb";
import type { WatchlistEntry, WatchStatus } from "../types/db";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getLibrary(userId?: string): Promise<WatchlistEntry[]> {
  const uid = userId ?? (await currentUserId());
  if (!uid) return [];
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", uid)
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data as WatchlistEntry[]) ?? [];
}

export async function getLibraryEntry(tmdbId: number, mediaType: MediaType): Promise<WatchlistEntry | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", uid)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();
  if (error) throw error;
  return (data as WatchlistEntry) ?? null;
}

export async function addToLibrary(title: Title, status: WatchStatus): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("watchlist").upsert(
    {
      user_id: uid,
      tmdb_id: title.tmdbId,
      media_type: title.mediaType,
      title: title.title,
      poster_path: title.posterPath,
      status,
    },
    { onConflict: "user_id,tmdb_id,media_type" }
  );
  if (error) throw error;
}

export async function updateStatus(entryId: string, status: WatchStatus): Promise<void> {
  const { error } = await supabase.from("watchlist").update({ status }).eq("id", entryId);
  if (error) throw error;
}

export async function removeFromLibrary(entryId: string): Promise<void> {
  const { error } = await supabase.from("watchlist").delete().eq("id", entryId);
  if (error) throw error;
}
