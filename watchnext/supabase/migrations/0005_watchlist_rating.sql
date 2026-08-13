-- Personal 1–5 star rating on a watchlist entry. Null = unrated.
alter table public.watchlist
  add column rating smallint check (rating between 1 and 5);
