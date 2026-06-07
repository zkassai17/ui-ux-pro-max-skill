create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  tmdb_id int not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  poster_path text,
  note text,
  status text not null check (status in ('pending','accepted','dismissed')) default 'pending',
  created_at timestamptz not null default now()
);

alter table public.recommendations enable row level security;

create policy "recs select involved" on public.recommendations
  for select using (auth.uid() in (from_user, to_user));

-- Can only send to an accepted friend, as yourself.
create policy "recs insert as sender to friend" on public.recommendations
  for insert with check (
    from_user = auth.uid()
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = to_user) or
          (f.addressee_id = auth.uid() and f.requester_id = to_user)
        )
    )
  );

-- Recipient can accept/dismiss.
create policy "recs update as recipient" on public.recommendations
  for update using (to_user = auth.uid());

create index recommendations_to_idx on public.recommendations (to_user, status, created_at desc);
create index recommendations_from_idx on public.recommendations (from_user, created_at desc);
