import { recToWatchlistInsert } from "../src/lib/recommendLogic";
import type { Recommendation } from "../src/types/db";

const rec: Recommendation = {
  id: "r1",
  from_user: "f",
  to_user: "me",
  tmdb_id: 42,
  media_type: "tv",
  title: "Shogun",
  poster_path: "/s.jpg",
  note: "watch it",
  status: "pending",
  created_at: "t",
};

test("recToWatchlistInsert maps a rec to a 'want' insert for the recipient", () => {
  expect(recToWatchlistInsert(rec, "me")).toEqual({
    user_id: "me",
    tmdb_id: 42,
    media_type: "tv",
    title: "Shogun",
    poster_path: "/s.jpg",
    status: "want",
  });
});
