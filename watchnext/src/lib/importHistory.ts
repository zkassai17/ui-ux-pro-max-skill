// Cleans streaming-service watch-history exports (e.g. Netflix's "Download all"
// CSV) and free-pasted lists into a deduped set of show/movie titles.

// A ": " segment that signals an episode/season descriptor rather than part of
// the title itself. Used to trim "Cobra Kai: Season 1: Episode 3" → "Cobra Kai"
// while leaving real colons ("Mission: Impossible") intact.
const EPISODE_MARKER =
  /^(season \d+|episode\b|limited series|miniseries|part \d+|chapter \d+|volume \d+|book \d+|series \d+|specials?)\b/i;

export function cleanTitle(raw: string): string {
  const parts = raw.split(":").map((p) => p.trim());
  let cut = parts.length;
  for (let i = 1; i < parts.length; i++) {
    if (EPISODE_MARKER.test(parts[i])) {
      cut = i;
      break;
    }
  }
  return parts.slice(0, cut).join(": ").trim();
}

// Returns the first CSV field of a line, honoring quotes (with "" escapes).
// For a plain line with no leading quote and no comma, returns the whole line.
function firstField(line: string): string {
  if (line[0] === '"') {
    let out = "";
    let i = 1;
    while (i < line.length) {
      if (line[i] === '"') {
        if (line[i + 1] === '"') {
          out += '"';
          i += 2;
          continue;
        }
        break;
      }
      out += line[i];
      i++;
    }
    return out;
  }
  const comma = line.indexOf(",");
  return comma === -1 ? line : line.slice(0, comma);
}

export function parseWatchHistory(raw: string): string[] {
  const text = raw.replace(/^﻿/, "");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const field = firstField(trimmed).trim();
    if (!field || field.toLowerCase() === "title") continue;
    const title = cleanTitle(field);
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}
