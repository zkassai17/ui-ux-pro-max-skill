// Pure helpers for feed reactions. The service fetches raw reaction rows; this
// rolls them up per feed item into counts + "did I react, with what".

export type ReactionRow = { target_id: string; emoji: string; user_id: string };

export type ReactionSummary = {
  counts: Record<string, number>; // emoji -> how many people used it
  mine: string | null; // the emoji I reacted with, if any
  total: number;
};

export function summarizeReactions(
  rows: ReactionRow[],
  myId: string | null,
): Record<string, ReactionSummary> {
  const map: Record<string, ReactionSummary> = {};
  for (const r of rows) {
    const s = (map[r.target_id] ??= { counts: {}, mine: null, total: 0 });
    s.counts[r.emoji] = (s.counts[r.emoji] ?? 0) + 1;
    s.total += 1;
    if (myId && r.user_id === myId) s.mine = r.emoji;
  }
  return map;
}

// What tapping an emoji should do given my current reaction on that item:
// tapping the one I already chose clears it; anything else sets/replaces.
export function nextReaction(current: string | null, tapped: string): { action: "set" | "remove"; emoji: string } {
  if (current === tapped) return { action: "remove", emoji: tapped };
  return { action: "set", emoji: tapped };
}
