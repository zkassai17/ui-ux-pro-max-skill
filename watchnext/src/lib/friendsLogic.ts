import type { Friendship } from "../types/db";

export function deriveFriendIds(rows: Friendship[], myId: string): string[] {
  return rows
    .filter((r) => r.status === "accepted" && (r.requester_id === myId || r.addressee_id === myId))
    .map((r) => (r.requester_id === myId ? r.addressee_id : r.requester_id));
}

export function deriveIncomingRequests(rows: Friendship[], myId: string): Friendship[] {
  return rows.filter((r) => r.status === "pending" && r.addressee_id === myId);
}

export function friendshipWith(rows: Friendship[], myId: string, otherId: string): Friendship | null {
  return (
    rows.find(
      (r) =>
        (r.requester_id === myId && r.addressee_id === otherId) ||
        (r.requester_id === otherId && r.addressee_id === myId)
    ) ?? null
  );
}
