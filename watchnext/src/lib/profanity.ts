// Basic profanity filter for user-generated content (reviews + recommendation
// notes). This is deliberately simple — it blocks obvious slurs and profanity so
// we can demonstrate content filtering (Apple App Review Guideline 1.2). It won't
// catch every creative spelling; report + block cover the rest. Extend BLOCKLIST
// as needed.
const BLOCKLIST = [
  "fuck", "fucking", "fucker", "motherfucker", "shit", "bullshit", "bitch",
  "cunt", "asshole", "dickhead", "bastard", "slut", "whore", "faggot", "fag",
  "nigger", "nigga", "retard", "retarded", "spic", "chink", "kike", "tranny",
  "cock", "pussy", "dick", "twat", "wanker", "jackass", "douchebag",
];

const PROFANITY_RX = new RegExp("\\b(" + BLOCKLIST.join("|") + ")\\b", "i");

// Fold common leetspeak so "sh1t" / "f4g" still match.
const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s" };
function deleet(s: string): string {
  return s.replace(/[013457@$]/g, (c) => LEET[c] ?? c);
}

// True if the text contains blocked language.
export function containsProfanity(text: string): boolean {
  if (!text) return false;
  const raw = text.toLowerCase();
  return PROFANITY_RX.test(raw) || PROFANITY_RX.test(deleet(raw));
}
