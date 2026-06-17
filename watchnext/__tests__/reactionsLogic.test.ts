import { summarizeReactions, nextReaction, type ReactionRow } from "../src/lib/reactionsLogic";

const rows: ReactionRow[] = [
  { target_id: "w:1", emoji: "👍", user_id: "me" },
  { target_id: "w:1", emoji: "👍", user_id: "bob" },
  { target_id: "w:1", emoji: "🔥", user_id: "ana" },
  { target_id: "r:2", emoji: "❤️", user_id: "bob" },
];

describe("summarizeReactions", () => {
  it("rolls up counts per item", () => {
    const s = summarizeReactions(rows, "me");
    expect(s["w:1"].counts).toEqual({ "👍": 2, "🔥": 1 });
    expect(s["w:1"].total).toBe(3);
    expect(s["r:2"].counts).toEqual({ "❤️": 1 });
  });

  it("marks which emoji I used", () => {
    const s = summarizeReactions(rows, "me");
    expect(s["w:1"].mine).toBe("👍");
    expect(s["r:2"].mine).toBeNull(); // I didn't react to r:2
  });

  it("mine is null when I'm not signed in / no id", () => {
    const s = summarizeReactions(rows, null);
    expect(s["w:1"].mine).toBeNull();
  });

  it("returns an empty map for no rows", () => {
    expect(summarizeReactions([], "me")).toEqual({});
  });
});

describe("nextReaction", () => {
  it("removes when tapping the emoji I already chose", () => {
    expect(nextReaction("👍", "👍")).toEqual({ action: "remove", emoji: "👍" });
  });

  it("sets when tapping a different emoji", () => {
    expect(nextReaction("👍", "🔥")).toEqual({ action: "set", emoji: "🔥" });
  });

  it("sets when I had no reaction", () => {
    expect(nextReaction(null, "❤️")).toEqual({ action: "set", emoji: "❤️" });
  });
});
