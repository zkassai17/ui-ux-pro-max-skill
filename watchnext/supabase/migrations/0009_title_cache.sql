-- Shared metadata cache: stores stable title data (genres, overview, poster, year)
-- so the app reads it from our own DB instead of re-fetching every title from the
-- paid data API. One user's lookup fills the cache for everyone.
create table if not exists public.title_cache (
  media_type text not null,
  tmdb_id bigint not null,
  title text,
  year text,
  poster_path text,
  rating numeric,
  overview text,
  genres text[] not null default '{}',
  original_language text,
  cached_at timestamptz not null default now(),
  primary key (media_type, tmdb_id)
);

alter table public.title_cache enable row level security;

create policy "title_cache read" on public.title_cache
  for select to authenticated using (true);
create policy "title_cache insert" on public.title_cache
  for insert to authenticated with check (true);
create policy "title_cache update" on public.title_cache
  for update to authenticated using (true) with check (true);
