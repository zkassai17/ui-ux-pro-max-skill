import { supabase } from "./supabase";
import { titleKey } from "../lib/forYouLogic";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Titles the user marked "Not interested" — excluded from For You suggestions and
// nudged away from via the engine. Returned as a Set of titleKeys for cheap lookup.
export async function getHiddenKeys(): Promise<Set<string>> {
  const uid = await currentUserId();
  if (!uid) return new Set();
  const { data, error } = await supabase
    .from("hidden_recs")
    .select("tmdb_id, media_type")
    .eq("user_id", uid);
  if (error) throw error;
  return new Set(
    (data ?? []).map((r) => titleKey({ mediaType: r.media_type as string, tmdbId: r.tmdb_id as number }))
  );
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
