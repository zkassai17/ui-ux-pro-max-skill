import type { WatchlistEntry, Recommendation } from "../types/db";

export type FeedItem =
  | { kind: "watchlist"; id: string; userId: string; at: string; entry: WatchlistEntry }
  | { kind: "recommendation"; id: string; userId: string; at: string; rec: Recommendation };

export function buildFeed(watchlist: WatchlistEntry[], recs: Recommendation[]): FeedItem[] {
  const items: FeedItem[] = [
    ...watchlist.map(
      (e): FeedItem => ({ kind: "watchlist", id: `w:${e.id}`, userId: e.user_id, at: e.added_at, entry: e })
    ),
    ...recs.map(
      (r): FeedItem => ({ kind: "recommendation", id: `r:${r.id}`, userId: r.from_user, at: r.created_at, rec: r })
    ),
  ];
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
