-- A short public review/note a user can attach to a title in their library.
-- Visible to friends via the existing friend-read policy on watchlist (0003),
-- and surfaced in the activity feed.
alter table public.watchlist add column if not exists note text;
