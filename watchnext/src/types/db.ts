export type Profile = {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  friend_code: string;
  avatar_url: string | null;
  is_private: boolean;
  created_at: string;
};

// Convenience: full name from a profile, or "" if no name set.
export function fullName(p: { first_name?: string | null; last_name?: string | null }): string {
  return [p.first_name, p.last_name].filter(Boolean).join(" ").trim();
}

export type WatchStatus = "want" | "watching" | "watched";

export type WatchlistEntry = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  year: string | null;
  status: WatchStatus;
  rating: number | null;
  is_favorite?: boolean; // user-curated favorite, independent of rating
  note?: string | null; // short public review, shown in the activity feed
  added_at: string;
};

export type FriendshipStatus = "pending" | "accepted";

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
};

export type RecommendationStatus = "pending" | "accepted" | "dismissed";

export type Recommendation = {
  id: string;
  from_user: string;
  to_user: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  note: string | null;
  status: RecommendationStatus;
  created_at: string;
};
