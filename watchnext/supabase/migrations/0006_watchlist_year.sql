-- Release year shown alongside each library row. Text, since TMDB gives a
-- release/first-air date that may be partial or missing. Null for older rows
-- added before this column existed; they fill in if re-added.
alter table public.watchlist
  add column year text;
