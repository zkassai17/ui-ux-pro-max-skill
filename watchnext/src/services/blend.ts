import { getLibrary } from "./watchlist";
import { getWatchTogether } from "./watchTogether";
import { computeTasteMatch, type TasteMatch } from "../lib/tasteMatchLogic";
import type { GroupPick } from "../lib/watchTogetherLogic";
import type { Suggestion } from "../types/tmdb";

export type BlendResult = {
  // Compatibility stats for the shareable match card (%, shows in common,
  // shared favorites…).
  match: TasteMatch;
  // Titles you BOTH want (mutual wishlist) — the strongest blend picks.
  mutual: GroupPick[];
  // Recommendations tuned to the two of you combined (the "blend feed").
  feed: Suggestion[];
};

// "Spotify Blend for TV": merges you + a friend into one taste and returns the
// compatibility card data plus a shared recommendation feed. Built entirely from
// existing pieces — taste-match for the card, the group hybrid engine for the feed.
export async function getBlend(friendId: string): Promise<BlendResult> {
  const [mine, theirs, group] = await Promise.all([
    getLibrary(),
    getLibrary(friendId),
    getWatchTogether([friendId]),
  ]);
  const match = computeTasteMatch(mine, theirs);
  const mutual = group.picks.filter((p) => p.wantedBy >= 2);
  return { match, mutual, feed: group.suggestions };
}
