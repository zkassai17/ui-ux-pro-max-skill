import type { Title } from "../types/tmdb";

// Produces a looser version of a failed query so a second TMDB pass can still
// match. Multi-word queries drop the trailing word (handles extra/typo'd tail
// words); single words fall back to a shorter prefix (handles internal typos,
// since a correct prefix still matches). Returns "" when nothing useful remains.
export function relaxQuery(query: string): string {
  const q = query.trim().replace(/\s+/g, " ");
  if (!q) return "";
  const words = q.split(" ");
  if (words.length > 1) return words.slice(0, -1).join(" ");
  const prefixLen = Math.floor(q.length * 0.7);
  if (prefixLen < 3) return "";
  return q.slice(0, prefixLen);
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

// Best similarity between the query and any substring window of the title of
// equal length, so "matrix" scores high against "The Matrix". 1 = exact.
function similarity(query: string, title: string): number {
  const q = query.toLowerCase();
  const t = title.toLowerCase();
  if (!q || !t) return 0;
  if (t.includes(q)) return 1;
  const dist = levenshtein(q, t);
  return 1 - dist / Math.max(q.length, t.length);
}

export function rankByFuzzy(query: string, titles: Title[]): Title[] {
  return [...titles]
    .map((title, i) => ({ title, i, score: similarity(query, title.title) }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.i - b.i))
    .map((e) => e.title);
}
