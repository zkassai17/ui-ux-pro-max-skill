import { buildFeed } from "../src/lib/feedLogic";
import type { WatchlistEntry, Recommendation } from "../src/types/db";

const wl: WatchlistEntry[] = [
  { id: "w1", user_id: "a", tmdb_id: 1, media_type: "tv", title: "Severance", poster_path: null, year: null, status: "watched", rating: null, added_at: "2026-06-01T10:00:00Z" },
  { id: "w2", user_id: "b", tmdb_id: 2, media_type: "movie", title: "Dune", poster_path: null, year: null, status: "watching", rating: null, added_at: "2026-06-03T10:00:00Z" },
];
const recs: Recommendation[] = [
  { id: "r1", from_user: "c", to_user: "x", tmdb_id: 3, media_type: "movie", title: "Oppenheimer", poster_path: null, note: null, status: "pending", created_at: "2026-06-02T10:00:00Z" },
];

test("buildFeed merges watchlist + recs and sorts newest first", () => {
  const feed = buildFeed(wl, recs);
  expect(feed.map((f) => f.id)).toEqual(["w:w2", "r:r1", "w:w1"]);
  expect(feed[0].kind).toBe("watchlist");
  expect(feed[1].kind).toBe("recommendation");
});

test("feed items carry the acting user id and timestamp", () => {
  const feed = buildFeed(wl, recs);
  expect(feed[0].userId).toBe("b");
  expect(feed[0].at).toBe("2026-06-03T10:00:00Z");
});
