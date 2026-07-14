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

// Split one CSV line into fields, honoring quotes and "" escapes.
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = false;
      } else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { out.push(cur); cur = ""; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

// Parse a watch-history export or pasted list into deduped show/movie titles.
// Header-aware: picks the title column from Netflix ("Title"), Letterboxd ("Name")
// or IMDb ("Title") exports; falls back to first-column / whole-line for plain
// pasted lists.
export function parseWatchHistory(raw: string): string[] {
  const text = raw.replace(/^﻿/, "");
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const header = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const titleCol = header.findIndex((h) => h === "title" || h === "name");
  const hasHeader = titleCol !== -1;
  const rows = hasHeader ? lines.slice(1) : lines;
  const col = hasHeader ? titleCol : 0;

  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of rows) {
    const fields = splitCsvLine(line);
    const field = (fields[col] ?? fields[0] ?? "").trim();
    if (!field) continue;
    // A stray header word in a plain (headerless) paste shouldn't become a title.
    if (!hasHeader && (field.toLowerCase() === "title" || field.toLowerCase() === "name")) continue;
    const title = cleanTitle(field);
    if (!title) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(title);
  }
  return out;
}
