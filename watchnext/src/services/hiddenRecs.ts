import { supabase } from "./supabase";
import { titleKey } from "../lib/forYouLogic";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export type HiddenTitle = { tmdbId: number; mediaType: string };

// Titles the user marked "Not interested".
export async function getHiddenTitles(): Promise<HiddenTitle[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("hidden_recs")
    .select("tmdb_id, media_type")
    .eq("user_id", uid);
  if (error) throw error;
  return (data ?? []).map((r) => ({ tmdbId: r.tmdb_id as number, mediaType: r.media_type as string }));
}

// Same data as a Set of titleKeys for cheap exclude lookups in the UI.
export async function getHiddenKeys(): Promise<Set<string>> {
  const hidden = await getHiddenTitles();
  return new Set(hidden.map((h) => titleKey(h)));
}

export async function hideRec(title: { tmdbId: number; mediaType: string }): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("hidden_recs").upsert(
    { user_id: uid, tmdb_id: title.tmdbId, media_type: title.mediaType },
    { onConflict: "user_id,tmdb_id,media_type" }
  );
  if (error) throw error;
}

// Un-hide a title the user marked "Not interested" — powers undo on the swipe
// deck. Deliberately tolerant: if it isn't hidden, that's already the goal.
export async function unhideRec(title: { tmdbId: number; mediaType: string }): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase
    .from("hidden_recs")
    .delete()
    .eq("user_id", uid)
    .eq("tmdb_id", title.tmdbId)
    .eq("media_type", title.mediaType);
  if (error) throw error;
}
