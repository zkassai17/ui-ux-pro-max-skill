// A Postgres UPDATE/DELETE that matches no rows succeeds — it just does nothing.
// Supabase reports no error for that, so a caller can't tell a real write from a
// silent no-op (a stale row id, or row-level security quietly filtering the row).
// Without this the app reports "saved" for a change that never happened, and the
// value snaps back on the next refetch.
//
// Pair with `.select(...)` on the write and pass the returned rows here.
export function assertWrote(rows: unknown[] | null | undefined, message: string): void {
  if (!rows || rows.length === 0) {
    throw new Error(`${message} Pull to refresh and try again.`);
  }
}
