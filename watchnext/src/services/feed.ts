import { supabase } from "./supabase";
import type { WatchlistEntry, Recommendation, Friendship, Profile } from "../types/db";
import { deriveFriendIds } from "../lib/friendsLogic";
import { buildFeed, type FeedItem } from "../lib/feedLogic";

export type FeedRow = { item: FeedItem; username: string | null };

export async function getFeed(): Promise<FeedRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  const { data: frows, error: ferr } = await supabase.from("friendships").select("*");
  if (ferr) throw ferr;
  const friendIds = deriveFriendIds((frows as Friendship[]) ?? [], uid);
  if (friendIds.length === 0) return [];

  const { data: wl, error: wlErr } = await supabase
    .from("watchlist")
    .select("*")
    .in("user_id", friendIds)
    .order("added_at", { ascending: false })
    .limit(50);
  if (wlErr) throw wlErr;

  const { data: recs, error: recErr } = await supabase
    .from("recommendations")
    .select("*")
    .in("from_user", friendIds)
    .order("created_at", { ascending: false })
    .limit(50);
  if (recErr) throw recErr;

  const { data: profs, error: pErr } = await supabase.from("profiles").select("*").in("id", friendIds);
  if (pErr) throw pErr;
  const profiles = (profs as Profile[]) ?? [];

  const feed = buildFeed((wl as WatchlistEntry[]) ?? [], (recs as Recommendation[]) ?? []);
  return feed.map((item) => ({
    item,
    username: profiles.find((p) => p.id === item.userId)?.username ?? null,
  }));
}
