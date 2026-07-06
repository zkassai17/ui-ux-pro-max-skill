// Pure entitlement/gating logic for watchnext Pro. No React, no I/O — just the
// rules that decide what a free vs. Pro user can do. Kept pure so it's unit-tested
// and the UI simply reads the answers. The `isPro` flag is sourced elsewhere
// (ProProvider) — at launch that source becomes the real store receipt.

// Free-tier caps. Bump these to change what "free" means in one place.
export const FREE_FRIEND_LIMIT = 10;
// Free users can open a Blend with their top-N friends (ranked by match); the
// rest are locked behind Pro.
export const FREE_BLEND_LIMIT = 2;

export type InsightsLevel = "basic" | "full";

// How many friends a user may have. Pro is unlimited.
export function friendLimit(isPro: boolean): number {
  return isPro ? Infinity : FREE_FRIEND_LIMIT;
}

// Can this user add one more friend given how many they already have?
export function canAddFriend(isPro: boolean, currentCount: number): boolean {
  return currentCount < friendLimit(isPro);
}

// How many distinct friends a free user can Blend with. Pro is unlimited.
export function blendLimit(isPro: boolean): number {
  return isPro ? Infinity : FREE_BLEND_LIMIT;
}

// Given a friend's rank in the match-sorted list (0 = best match), is their
// Blend locked for this user? Free users get the top FREE_BLEND_LIMIT unlocked.
export function isBlendLocked(isPro: boolean, rankIndex: number): boolean {
  if (isPro) return false;
  return rankIndex >= FREE_BLEND_LIMIT;
}

// Depth of taste insights shown on the profile.
export function insightsLevel(isPro: boolean): InsightsLevel {
  return isPro ? "full" : "basic";
}

// Pricing plans shown on the paywall. `id` maps to the store product id later.
export type ProPlan = {
  id: "monthly" | "yearly" | "lifetime";
  price: string;
  period: string;
  bestValue?: boolean;
};

export const PRO_PLANS: ProPlan[] = [
  { id: "yearly", price: "$19.99", period: "/year", bestValue: true },
  { id: "monthly", price: "$2.99", period: "/month" },
  { id: "lifetime", price: "$39.99", period: "one-time" },
];
