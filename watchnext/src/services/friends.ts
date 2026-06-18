import { supabase } from "./supabase";
import type { Friendship, Profile } from "../types/db";
import { deriveFriendIds, deriveIncomingRequests } from "../lib/friendsLogic";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function getMyFriendshipRows(): Promise<Friendship[]> {
  const { data, error } = await supabase.from("friendships").select("*");
  if (error) throw error;
  return (data as Friendship[]) ?? [];
}

export async function searchUsers(q: string): Promise<Profile[]> {
  // Commas/parens would break PostgREST's .or() filter syntax — strip them.
  const query = q.trim().replace(/[,()]/g, " ").trim();
  if (!query) return [];
  const uid = await currentUserId();
  const like = `%${query}%`;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`username.ilike.${like},first_name.ilike.${like},last_name.ilike.${like}`)
    .limit(20);
  if (error) throw error;
  return ((data as Profile[]) ?? []).filter((p) => p.id !== uid);
}

export async function lookupByFriendCode(
  code: string
): Promise<{
  id: string;
  username: string;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
} | null> {
  const { data, error } = await supabase.rpc("lookup_user_by_friend_code", { code: code.trim() });
  if (error) throw error;
  const rows =
    (data as {
      id: string;
      username: string;
      avatar_url: string | null;
      first_name: string | null;
      last_name: string | null;
    }[]) ?? [];
  return rows[0] ?? null;
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: uid, addressee_id: addresseeId, status: "pending" });
  if (error) throw error;
}

export async function acceptRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  if (error) throw error;
}

export async function declineRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export async function unfriend(friendshipId: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export async function getFriends(): Promise<Profile[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const ids = deriveFriendIds(await getMyFriendshipRows(), uid);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export type IncomingRequest = { friendship: Friendship; profile: Profile | null };

export async function getIncomingRequests(): Promise<IncomingRequest[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const incoming = deriveIncomingRequests(await getMyFriendshipRows(), uid);
  if (incoming.length === 0) return [];
  const requesterIds = incoming.map((r) => r.requester_id);
  const { data, error } = await supabase.from("profiles").select("*").in("id", requesterIds);
  if (error) throw error;
  const profiles = (data as Profile[]) ?? [];
  return incoming.map((f) => ({
    friendship: f,
    profile: profiles.find((p) => p.id === f.requester_id) ?? null,
  }));
}

export type StatBucket = { want: number; watching: number; watched: number };
export type FriendStats = StatBucket & { movie: StatBucket; tv: StatBucket };

export async function getFriendStats(userId: string): Promise<FriendStats> {
  const { data, error } = await supabase
    .from("watchlist")
    .select("status, media_type")
    .eq("user_id", userId);
  if (error) throw error;
  const rows = (data as { status: string; media_type: string }[]) ?? [];
  const bucket = (keep: (r: { media_type: string }) => boolean): StatBucket => ({
    want: rows.filter((r) => r.status === "want" && keep(r)).length,
    watching: rows.filter((r) => r.status === "watching" && keep(r)).length,
    watched: rows.filter((r) => r.status === "watched" && keep(r)).length,
  });
  return {
    ...bucket(() => true),
    movie: bucket((r) => r.media_type === "movie"),
    tv: bucket((r) => r.media_type === "tv"),
  };
}
