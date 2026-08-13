// Private comp code that unlocks watchnext Pro (founder / personal use, giveaways).
// This is a client-side check — fine for handing yourself and friends free Pro,
// but it is NOT a licensing system (a determined user could find it in the bundle).
// Change PRO_REDEEM_CODE to whatever secret you want.
export const PRO_REDEEM_CODE = "ZK-FOUNDER-2026";

// Case-insensitive, whitespace-tolerant match so "zk-founder-2026 " still works.
export function isValidRedeemCode(input: string): boolean {
  return input.trim().toUpperCase() === PRO_REDEEM_CODE.toUpperCase();
}
