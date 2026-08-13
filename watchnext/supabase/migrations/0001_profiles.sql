create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  friend_code text unique not null,
  avatar_url text,
  is_private boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A user can read any non-private profile, and always their own.
create policy "read visible profiles"
  on public.profiles for select
  using (not is_private or id = auth.uid());

-- A user can insert only their own profile row.
create policy "insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- A user can update only their own profile.
create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid());
