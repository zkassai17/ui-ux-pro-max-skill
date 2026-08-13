import { supabase } from "./supabase";
import { summarizeReactions, type ReactionRow, type ReactionSummary } from "../lib/reactionsLogic";

// Fetch reactions for a batch of feed items and roll them up per item.
export async function getReactions(targetIds: string[]): Promise<Record<string, ReactionSummary>> {
  if (targetIds.length === 0) return {};
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id ?? null;
  const { data, error } = await supabase
    .from("feed_reactions")
    .select("target_id,emoji,user_id")
    .in("target_id", targetIds);
  if (error) throw error;
  return summarizeReactions((data as ReactionRow[]) ?? [], me);
}

// Set (or replace) my reaction on a feed item.
export async function setReaction(targetId: string, targetOwner: string, emoji: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase
    .from("feed_reactions")
    .upsert({ user_id: me, target_id: targetId, target_owner: targetOwner, emoji }, { onConflict: "user_id,target_id" });
  if (error) throw error;
}

// Clear my reaction on a feed item.
export async function removeReaction(targetId: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const me = auth.user?.id;
  if (!me) throw new Error("Not signed in");
  const { error } = await supabase.from("feed_reactions").delete().eq("user_id", me).eq("target_id", targetId);
  if (error) throw error;
}
