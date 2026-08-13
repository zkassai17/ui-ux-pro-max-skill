import { deriveFriendIds, deriveIncomingRequests, friendshipWith } from "../src/lib/friendsLogic";
import type { Friendship } from "../src/types/db";

const me = "me";
const rows: Friendship[] = [
  { id: "1", requester_id: "me", addressee_id: "a", status: "accepted", created_at: "t1" },
  { id: "2", requester_id: "b", addressee_id: "me", status: "accepted", created_at: "t2" },
  { id: "3", requester_id: "c", addressee_id: "me", status: "pending", created_at: "t3" },
  { id: "4", requester_id: "me", addressee_id: "d", status: "pending", created_at: "t4" },
  { id: "5", requester_id: "x", addressee_id: "y", status: "accepted", created_at: "t5" },
];

test("deriveFriendIds returns the other side of accepted friendships involving me", () => {
  expect(deriveFriendIds(rows, me).sort()).toEqual(["a", "b"]);
});

test("deriveIncomingRequests returns only pending rows addressed to me", () => {
  expect(deriveIncomingRequests(rows, me).map((r) => r.id)).toEqual(["3"]);
});

test("friendshipWith finds a row in either direction or null", () => {
  expect(friendshipWith(rows, me, "a")?.id).toBe("1");
  expect(friendshipWith(rows, me, "b")?.id).toBe("2");
  expect(friendshipWith(rows, me, "zzz")).toBeNull();
});
