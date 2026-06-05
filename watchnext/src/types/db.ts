export type Profile = {
  id: string;
  username: string;
  friend_code: string;
  avatar_url: string | null;
  is_private: boolean;
  created_at: string;
};
