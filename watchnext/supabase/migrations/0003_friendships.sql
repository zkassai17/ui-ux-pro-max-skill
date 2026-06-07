create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null check (status in ('pending','accepted')) default 'pending',
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

create policy "friendships select involved" on public.friendships
  for select using (auth.uid() in (requester_id, addressee_id));
create policy "friendships insert as requester" on public.friendships
  for insert with check (requester_id = auth.uid());
create policy "friendships accept as addressee" on public.friendships
  for update using (addressee_id = auth.uid());
create policy "friendships delete involved" on public.friendships
  for delete using (auth.uid() in (requester_id, addressee_id));

create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

-- Accepted friends may read each other's watchlist (the deferred policy from 0002).
create policy "watchlist friend select" on public.watchlist
  for select using (
    exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = watchlist.user_id) or
          (f.addressee_id = auth.uid() and f.requester_id = watchlist.user_id)
        )
    )
  );

-- You may read the profile of anyone you have a friendship row with (any status,
-- either direction). Covers accepted friends and incoming/outgoing requesters,
-- including private accounts. (friendships RLS references only auth.uid(), so no
-- policy recursion.)
create policy "read connected profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
         or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
    )
  );

-- Exact friend-code lookup that bypasses profile privacy, returning minimal data
-- so private users remain addable by code.
create or replace function public.lookup_user_by_friend_code(code text)
returns table (id uuid, username text, avatar_url text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.username, p.avatar_url
  from public.profiles p
  where p.friend_code = upper(code)
  limit 1;
$$;

revoke all on function public.lookup_user_by_friend_code(text) from public;
-- Supabase default privileges grant EXECUTE to anon on new functions; revoke it
-- explicitly so unauthenticated callers cannot enumerate friend codes.
revoke execute on function public.lookup_user_by_friend_code(text) from anon;
grant execute on function public.lookup_user_by_friend_code(text) to authenticated;
