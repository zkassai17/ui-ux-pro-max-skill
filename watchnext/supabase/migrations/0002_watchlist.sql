create table public.watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  status text not null check (status in ('want','watching','watched')) default 'want',
  added_at timestamptz not null default now(),
  unique (user_id, tmdb_id, media_type)
);

alter table public.watchlist enable row level security;

-- Owner has full access to their own rows.
create policy "watchlist owner select" on public.watchlist
  for select using (user_id = auth.uid());
create policy "watchlist owner insert" on public.watchlist
  for insert with check (user_id = auth.uid());
create policy "watchlist owner update" on public.watchlist
  for update using (user_id = auth.uid());
create policy "watchlist owner delete" on public.watchlist
  for delete using (user_id = auth.uid());

-- (A friend-read SELECT policy is added in 0003, after friendships exists.)

create index watchlist_user_idx on public.watchlist (user_id, added_at desc);
