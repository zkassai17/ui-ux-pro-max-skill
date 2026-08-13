-- An explicit "this is a favorite of mine" flag, separate from the 1–5 rating.
-- You can love something (rate it 5) without it being a favorite, and vice versa.
alter table public.watchlist
  add column is_favorite boolean not null default false;

-- Fast lookups for the profile Favorites strip.
create index if not exists watchlist_favorite_idx
  on public.watchlist (user_id) where is_favorite;
