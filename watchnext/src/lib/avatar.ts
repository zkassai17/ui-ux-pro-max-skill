// Shared avatar/match helpers used by the profile + friends screens.

export function initials(username?: string): string {
  if (!username) return "?";
  const cleaned = username.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.slice(0, 2).toUpperCase() || "?";
}

// Deterministic avatar color per username so friends are visually distinct.
const AVATAR_COLORS = ["#5b6cff", "#1dd1a1", "#ff9f43", "#ff6b9d", "#a55eea", "#26c6da", "#fd7272"];
export function avatarColor(username?: string): string {
  if (!username) return AVATAR_COLORS[0];
  let h = 0;
  for (let i = 0; i < username.length; i++) h = (h * 31 + username.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

// Cold→warm taste-match color so the % reads at a glance.
export function matchColor(score: number): string {
  if (score >= 80) return "#1dd1a1";
  if (score >= 60) return "#5b6cff";
  if (score >= 40) return "#ffc048";
  return "#ff9f43";
}
