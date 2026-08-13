import type { Title } from "../types/tmdb";

// Produces looser queries to retry when an exact search returns nothing.
// Multi-word queries retry each word on its own (a typo in one word — e.g.
// "covra kai" — still matches via the correctly-spelled word "kai").
// Single words fall back to a shorter prefix (handles internal typos, since a
// correct prefix still matches). Returns candidates in priority order.
export function relaxQueries(query: string): string[] {
  const q = query.trim().replace(/\s+/g, " ").toLowerCase();
  if (!q) return [];
  const words = q.split(" ").filter((w) => w.length >= 3);
  const out: string[] = [];
  if (words.length > 1) {
    out.push(...words);
  } else {
    const w = words[0] ?? q;
    const prefixLen = Math.floor(w.length * 0.7);
    if (prefixLen >= 3) out.push(w.slice(0, prefixLen));
  }
  return [...new Set(out)].filter((c) => c && c !== q);
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

// Similarity in [0,1]. Exact substring match scores 1. Otherwise the better of
// whole-string edit distance and the best single-word edit distance, so
// "covra kai" still scores high against "Cobra Kai".
function similarity(query: string, title: string): number {
  const q = query.toLowerCase().trim();
  const t = title.toLowerCase().trim();
  if (!q || !t) return 0;
  if (t.includes(q)) return 1;
  const whole = 1 - levenshtein(q, t) / Math.max(q.length, t.length);
  let bestWord = 0;
  for (const tw of t.split(/\s+/)) {
    for (const qw of q.split(/\s+/)) {
      const s = 1 - levenshtein(qw, tw) / Math.max(qw.length, tw.length);
      if (s > bestWord) bestWord = s;
    }
  }
  // Favor matching the whole query; a single matching word only nudges the score
  // so a short title ("Kai") can't outrank a fuller match ("Cobra Kai").
  return 0.7 * whole + 0.3 * bestWord;
}

export function rankByFuzzy(query: string, titles: Title[], minScore = 0): Title[] {
  return [...titles]
    .map((title, i) => ({ title, i, score: similarity(query, title.title) }))
    .filter((e) => e.score >= minScore)
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.i - b.i))
    .map((e) => e.title);
}
