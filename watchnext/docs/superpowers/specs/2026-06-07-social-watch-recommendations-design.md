# WatchNext — Social Watch & Recommendations (Phase 2) Design

**Status:** Approved (brainstorming)
**Date:** 2026-06-07
**Builds on:** Phase 1 (auth, profiles, 5-tab shell)

## Goal

Turn WatchNext from an empty shell into a working social app centered on a recommendation loop: users log what they watch (from the real TMDB catalog), connect with friends, see friends' activity, and send/receive title recommendations.

## Core Experience (the social loop)

1. **Your library** — add movies/shows from TMDB, each marked **Want / Watching / Watched**. This is your watch history.
2. **Friends** — connect with real users via username or friend code, using **mutual friend requests** (request → accept).
3. **Friends' activity** — a Feed of what friends watched / are watching / are recommending.
4. **Recommend** — from any title (yours or a friend's), send it to a friend with an optional note.
5. **Receive** — recommendations land in the **Recs** tab; accepting one drops the title into your "Want to watch" list.

## Scope

**In scope (this build):** TMDB search + title detail + posters; library with status; mutual friends (request/accept); friend's profile with their library; send/receive recommendations; activity feed; friend requests via a top-right envelope on the Feed.

**Out of scope (later phases):** Claude-powered "For You" recommendations; push notifications; app-store release; hardening the TMDB token behind an edge-function proxy.

## Architecture

### TMDB access
- **Direct calls** from the app to TMDB v4 API using a bearer token from `EXPO_PUBLIC_TMDB_TOKEN` (in `watchnext/.env`, gitignored).
- Service module `src/services/tmdb.ts` exposes:
  - `searchTitles(query): Promise<Title[]>` — TMDB `/search/multi`, filtered to movie & tv.
  - `getTrending(): Promise<Title[]>` — TMDB `/trending/all/week` (used only as a fallback/empty-feed filler; primary Feed is friend activity).
  - `getTitleDetails(mediaType, id): Promise<TitleDetail>` — `/movie/{id}` or `/tv/{id}`.
- All responses normalized to app types; the rest of the app never sees raw TMDB JSON.
- `posterUrl(path, size='w500')` builds `https://image.tmdb.org/t/p/{size}{path}`.
- All fetching wrapped in **React Query** (`@tanstack/react-query`, already installed) for caching, loading, and error states.

### Normalized types (`src/types/tmdb.ts`)
```ts
type MediaType = 'movie' | 'tv';
type Title = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;     // derived from release_date / first_air_date
  posterPath: string | null;
  rating: number | null;   // vote_average, 1 decimal
};
type TitleDetail = Title & {
  overview: string;
  genres: string[];
};
```

### Data model (Supabase, all RLS-protected)

**`watchlist`** (your library):
```
id uuid pk default gen_random_uuid()
user_id uuid not null references auth.users(id) on delete cascade
tmdb_id int not null
media_type text not null check (media_type in ('movie','tv'))
title text not null
poster_path text
status text not null check (status in ('want','watching','watched')) default 'want'
added_at timestamptz not null default now()
unique (user_id, tmdb_id, media_type)
```
RLS: user can select/insert/update/delete only rows where `user_id = auth.uid()`. PLUS a select policy allowing a user to read a row if its `user_id` is an **accepted friend** (needed to view a friend's library + build the feed).

**`friendships`** (mutual connections):
```
id uuid pk default gen_random_uuid()
requester_id uuid not null references auth.users(id) on delete cascade
addressee_id uuid not null references auth.users(id) on delete cascade
status text not null check (status in ('pending','accepted')) default 'pending'
created_at timestamptz not null default now()
unique (requester_id, addressee_id)
check (requester_id <> addressee_id)
```
- "My friends" = accepted rows where `auth.uid()` is requester or addressee (the friend is the other side).
- "Incoming requests" = pending rows where `addressee_id = auth.uid()`.
- RLS: select rows where `auth.uid()` in (requester_id, addressee_id); insert where `requester_id = auth.uid()`; update (accept) where `addressee_id = auth.uid()`; delete (unfriend/cancel) where `auth.uid()` in (requester_id, addressee_id).

**`recommendations`** (sent titles):
```
id uuid pk default gen_random_uuid()
from_user uuid not null references auth.users(id) on delete cascade
to_user uuid not null references auth.users(id) on delete cascade
tmdb_id int not null
media_type text not null check (media_type in ('movie','tv'))
title text not null
poster_path text
note text
status text not null check (status in ('pending','accepted','dismissed')) default 'pending'
created_at timestamptz not null default now()
```
RLS: select rows where `auth.uid()` in (from_user, to_user); insert where `from_user = auth.uid()` AND an accepted friendship exists with `to_user`; update where `to_user = auth.uid()` (accept/dismiss).

### Data layers (React Query hooks)
- `src/services/watchlist.ts` — `getLibrary(userId?)`, `addToLibrary(title, status)`, `updateStatus(entryId, status)`, `removeFromLibrary(entryId)`, `getLibraryEntry(tmdbId, mediaType)`.
- `src/services/friends.ts` — `searchUsers(q)`, `sendFriendRequest(addresseeId)`, `acceptRequest(friendshipId)`, `declineRequest(friendshipId)`, `unfriend(friendshipId)`, `getFriends()`, `getIncomingRequests()`, `getFriendStats(userId)`.
- `src/services/recommendations.ts` — `sendRecommendation(toUserId, title, note?)`, `getReceived()`, `acceptRecommendation(rec)` (insert watchlist 'want' + mark accepted), `dismissRecommendation(recId)`.
- `src/services/feed.ts` — `getFeed()` = friends' recent `watchlist` rows + friends' recent sent `recommendations`, merged and sorted by time, newest first.

## Screens / navigation

Tab bar becomes: **Feed · Library · Add · Recs · Profile**.

- **Feed (`app/(tabs)/for-you.tsx`)** — friend activity list (watched / watching / recommends). Top-right **envelope icon with unread badge** → navigates to Requests screen. Empty state when no friends/activity.
- **Library (`app/(tabs)/watchlist.tsx`)** — your titles with a status segmented filter (All / Want / Watching / Watched). Tap → title detail. Empty state guiding to Add.
- **Add (`app/(tabs)/add.tsx`)** — search box → TMDB results (poster, title, year, type). Tap → title detail.
- **Recs (`app/(tabs)/inbox.tsx`, retitled "Recs")** — received recommendations with sender + note, Add-to-Want / Dismiss actions.
- **Profile (`app/(tabs)/profile.tsx`)** — your username, friend code, watch stats, **Friends list**, **Add friend** entry, sign out.
- **Requests (`app/requests.tsx`)** — incoming friend requests, Accept / Decline.
- **Add friend (`app/friends/add.tsx`)** — search by username or enter friend code → send request.
- **Friend profile (`app/user/[id].tsx`)** — their stats, their library by status, "Recommend a title" + unfriend.
- **Title detail (`app/title/[mediaType]/[id].tsx`)** — poster, overview, genres, rating; "Add to library" (status picker) and "Recommend to a friend".
- **Send recommendation (`app/recommend/[mediaType]/[id].tsx`)** — title summary, friend picker (multi-select), optional note, send.

## Error & empty states
- Missing/invalid TMDB token → friendly "TMDB not configured" message in search/detail rather than a crash.
- Network errors → React Query retry; inline error with retry affordance.
- Empty feed / empty library / no friends / no recs → purposeful empty states pointing to the next action.
- Duplicate library add → upsert by `unique(user_id, tmdb_id, media_type)` (update status, no error).
- Sending a rec to a non-friend → blocked by RLS; UI only offers friends.

## Testing
- Unit: TMDB normalization (`searchTitles`/`getTitleDetails` mapping raw fixtures → `Title`/`TitleDetail`), `posterUrl`.
- Unit: friend-state derivation helpers (given friendships + my id → friends list / incoming requests), recommendation-accept logic (produces correct watchlist insert).
- Unit: feed merge/sort logic.
- Mock `fetch` for TMDB and the Supabase client for data layers. Follow Phase 1's Jest + jest-expo setup.

## Build order (high level)
1. TMDB service + types + tests; wire `.env` token.
2. `watchlist` table + RLS; library data layer + tests.
3. Add (search) + title detail + add-to-library.
4. Library tab with status filter.
5. `friendships` table + RLS; friends data layer + tests.
6. Add friend + Requests + Friends list (Profile).
7. Friend profile (view friend's library).
8. `recommendations` table + RLS; recommendations data layer + tests.
9. Send recommendation flow + Recs tab.
10. Feed (friend activity) + envelope/requests entry.
