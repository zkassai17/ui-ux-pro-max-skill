import type { WatchlistEntry } from "../types/db";

// Quote a CSV cell only when needed (comma, quote, or newline), doubling quotes.
function cell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const HEADER = ["Title", "Type", "Status", "Rating", "Year", "Added"];

// Render a watchlist as CSV text (RFC-4180-ish): header + one row per title.
export function buildLibraryCsv(entries: WatchlistEntry[]): string {
  const rows = entries.map((e) =>
    [
      cell(e.title),
      cell(e.media_type === "movie" ? "Movie" : "TV"),
      cell(e.status),
      cell(e.rating),
      cell(e.year),
      cell(e.added_at),
    ].join(",")
  );
  return [HEADER.join(","), ...rows].join("\n");
}
