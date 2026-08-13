import { supabase } from "./supabase";
import type { Profile, Recommendation } from "../types/db";
import type { Title } from "../types/tmdb";
import { recToWatchlistInsert } from "../lib/recommendLogic";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function sendRecommendation(toUserId: string, title: Title, note?: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("recommendations").insert({
    from_user: uid,
    to_user: toUserId,
    tmdb_id: title.tmdbId,
    media_type: title.mediaType,
    title: title.title,
    poster_path: title.posterPath,
    note: note?.trim() || null,
    status: "pending",
  });
  if (error) throw error;
}

export type ReceivedRec = { rec: Recommendation; from: Profile | null };

export async function getReceived(): Promise<ReceivedRec[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("to_user", uid)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const recs = (data as Recommendation[]) ?? [];
  if (recs.length === 0) return [];
  const senderIds = [...new Set(recs.map((r) => r.from_user))];
  const { data: profs, error: pErr } = await supabase.from("profiles").select("*").in("id", senderIds);
  if (pErr) throw pErr;
  const profiles = (profs as Profile[]) ?? [];
  return recs.map((rec) => ({ rec, from: profiles.find((p) => p.id === rec.from_user) ?? null }));
}

export async function acceptRecommendation(rec: Recommendation): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const insert = recToWatchlistInsert(rec, uid);
  const { error: upsertErr } = await supabase
    .from("watchlist")
    .upsert(insert, { onConflict: "user_id,tmdb_id,media_type" });
  if (upsertErr) throw upsertErr;
  const { error } = await supabase.from("recommendations").update({ status: "accepted" }).eq("id", rec.id);
  if (error) throw error;
}

export async function dismissRecommendation(recId: string): Promise<void> {
  const { error } = await supabase.from("recommendations").update({ status: "dismissed" }).eq("id", recId);
  if (error) throw error;
}
