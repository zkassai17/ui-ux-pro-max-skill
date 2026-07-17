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
      year: title.year,
      status,
    },
    { onConflict: "user_id,tmdb_id,media_type" }
  );
  if (error) throw error;
}

export async function updateStatus(entryId: string, status: WatchStatus): Promise<void> {
  // `.select()` so we can tell a real write from a no-op. An update that matches
  // no rows (e.g. blocked by row-level security, or a stale entry id) returns no
  // error — without this check the app would report success and silently revert.
  const { data, error } = await supabase
    .from("watchlist")
    .update({ status })
    .eq("id", entryId)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("That change didn't save. Pull to refresh and try again.");
}

export async function removeFromLibrary(entryId: string): Promise<void> {
  const { error } = await supabase.from("watchlist").delete().eq("id", entryId);
  if (error) throw error;
}

// Save (or clear, with empty/null) a short public review note on an entry.
// Trimmed and capped so a runaway note can't be stored.
export async function setNote(entryId: string, note: string | null): Promise<void> {
  const clean = note?.trim() ? note.trim().slice(0, 500) : null;
  const { error } = await supabase.from("watchlist").update({ note: clean }).eq("id", entryId);
  if (error) throw error;
}

// Rate an existing library entry by id. Setting a rating marks it watched
// (you only rate what you've seen); clearing (null) leaves the status alone.
export async function rateEntry(entryId: string, rating: number | null): Promise<void> {
  const patch = rating != null ? { rating, status: "watched" as WatchStatus } : { rating };
  const { error } = await supabase.from("watchlist").update(patch).eq("id", entryId);
  if (error) throw error;
}

// Sets (or clears, with null) the user's personal 1–5 rating. Rating a title
// you haven't added yet files it under "watched" — you only rate what you've seen.
export async function rateTitle(title: Title, rating: number | null): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const existing = await getLibraryEntry(title.tmdbId, title.mediaType);
  if (existing) {
    const { error } = await supabase.from("watchlist").update({ rating }).eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error } = await supabase.from("watchlist").upsert(
    {
      user_id: uid,
      tmdb_id: title.tmdbId,
      media_type: title.mediaType,
      title: title.title,
      poster_path: title.posterPath,
      year: title.year,
      status: "watched",
      rating,
    },
    { onConflict: "user_id,tmdb_id,media_type" }
  );
  if (error) throw error;
}
