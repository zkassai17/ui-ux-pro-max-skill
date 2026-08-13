import { supabase } from "./supabase";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// Permanently delete the signed-in user. The delete_account() RPC removes the
// auth.users row; every public table cascades from it, so all data goes with it.
// Then sign out locally.
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc("delete_account");
  if (error) throw error;
  await supabase.auth.signOut();
}

// Block a user: record the block AND drop any friendship between you, so they
// leave your friends list and feed and can't be found in search.
export async function blockUser(blockedId: string): Promise<void> {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase
    .from("blocks")
    .upsert({ blocker_id: me, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" });
  if (error) throw error;
  await supabase
    .from("friendships")
    .delete()
    .or(
      `and(requester_id.eq.${me},addressee_id.eq.${blockedId}),and(requester_id.eq.${blockedId},addressee_id.eq.${me})`
    );
}

export async function getBlockedIds(): Promise<string[]> {
  const me = await currentUserId();
  if (!me) return [];
  const { data, error } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", me);
  if (error) throw error;
  return (data ?? []).map((r) => r.blocked_id as string);
}

// File an abuse report (reviewed by the operator out-of-band).
export async function reportUser(reportedId: string, reason: string): Promise<void> {
  const me = await currentUserId();
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: me, reported_id: reportedId, reason });
  if (error) throw error;
}
