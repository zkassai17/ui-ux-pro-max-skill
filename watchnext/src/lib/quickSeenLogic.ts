import type { Title } from "../types/tmdb";
import { titleKey } from "./forYouLogic";

// Flattens several TMDB source lists (trending, popular movies, popular TV) into
// one ordered, deduped pool for the "Have you seen these?" quick-tap grid.
// First-seen order wins (so trending shows up before discover fill). Titles the
// user already has in their library (excludeKeys) and titles with no poster
// (nothing recognizable to tap) are dropped. Pure: no side effects.
export function buildCandidatePool(sources: Title[][], excludeKeys: Set<string>): Title[] {
  const seen = new Set<string>();
  const out: Title[] = [];
  for (const list of sources) {
    for (const item of list) {
      if (!item.posterPath) continue;
      const key = titleKey(item);
      if (excludeKeys.has(key)) continue;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
