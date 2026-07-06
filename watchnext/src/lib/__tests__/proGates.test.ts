import {
  FREE_FRIEND_LIMIT,
  FREE_BLEND_LIMIT,
  friendLimit,
  canAddFriend,
  blendLimit,
  isBlendLocked,
  insightsLevel,
  PRO_PLANS,
} from "../proGates";

describe("friendLimit", () => {
  it("caps free users at FREE_FRIEND_LIMIT", () => {
    expect(friendLimit(false)).toBe(FREE_FRIEND_LIMIT);
  });
  it("is unlimited for Pro", () => {
    expect(friendLimit(true)).toBe(Infinity);
  });
});

describe("canAddFriend", () => {
  it("allows a free user below the cap", () => {
    expect(canAddFriend(false, FREE_FRIEND_LIMIT - 1)).toBe(true);
  });
  it("blocks a free user at the cap", () => {
    expect(canAddFriend(false, FREE_FRIEND_LIMIT)).toBe(false);
  });
  it("always allows Pro, even past the free cap", () => {
    expect(canAddFriend(true, FREE_FRIEND_LIMIT + 50)).toBe(true);
  });
});

describe("blendLimit", () => {
  it("caps free users at FREE_BLEND_LIMIT", () => {
    expect(blendLimit(false)).toBe(FREE_BLEND_LIMIT);
  });
  it("is unlimited for Pro", () => {
    expect(blendLimit(true)).toBe(Infinity);
  });
});

describe("isBlendLocked", () => {
  it("unlocks the top FREE_BLEND_LIMIT friends for free users", () => {
    expect(isBlendLocked(false, 0)).toBe(false);
    expect(isBlendLocked(false, FREE_BLEND_LIMIT - 1)).toBe(false);
  });
  it("locks friends beyond the free limit", () => {
    expect(isBlendLocked(false, FREE_BLEND_LIMIT)).toBe(true);
    expect(isBlendLocked(false, FREE_BLEND_LIMIT + 5)).toBe(true);
  });
  it("never locks anything for Pro", () => {
    expect(isBlendLocked(true, 0)).toBe(false);
    expect(isBlendLocked(true, 999)).toBe(false);
  });
});

describe("insightsLevel", () => {
  it("is basic for free", () => {
    expect(insightsLevel(false)).toBe("basic");
  });
  it("is full for Pro", () => {
    expect(insightsLevel(true)).toBe("full");
  });
});

describe("PRO_PLANS", () => {
  it("exposes exactly one best-value plan", () => {
    expect(PRO_PLANS.filter((p) => p.bestValue)).toHaveLength(1);
  });
  it("offers monthly, yearly, and lifetime", () => {
    expect(PRO_PLANS.map((p) => p.id).sort()).toEqual(["lifetime", "monthly", "yearly"]);
  });
});
