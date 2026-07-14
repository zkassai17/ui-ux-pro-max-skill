// Cleans streaming-service watch-history exports (e.g. Netflix's "Download all"
// CSV) and free-pasted lists into a deduped set of show/movie titles.

// A ": " segment that signals an episode/season descriptor rather than part of
// the title itself. Recognizes both numeric ("Season 4") and spelled-out
// ("Chapter One", "Book Two") counts, plus roman numerals — the count word must
// be followed by a number/ordinal so real subtitles ("Book Club") stay intact.
// Standalone descriptors (Limited Series, Miniseries, Specials) match on their own.
const EPISODE_MARKER =
  /^((season|episode|chapter|part|volume|book|series)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|[ivx]+)|limited series|mini-?series|specials?)\b/i;

export function cleanTitle(raw: string): string {
  const parts = raw.split(":").map((p) => p.trim());
  // Cut at the first episode/season marker — this keeps a colon'd series name
  // intact before the marker (e.g. "Avatar: The Last Airbender: Book One" → the
  // full show), and drops everything from the marker on.
  for (let i = 1; i < parts.length; i++) {
    if (EPISODE_MARKER.test(parts[i])) return parts.slice(0, i).join(": ").trim();
  }
  // No recognizable marker but 3+ segments is almost always Netflix's
  // "Series: Season: Episode" shape — drop the trailing episode title so all of a
  // show's episodes collapse to the same string instead of matching separately.
  if (parts.length >= 3) return parts.slice(0, parts.length - 1).join(": ").trim();
  return parts.join(": ").trim();
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
