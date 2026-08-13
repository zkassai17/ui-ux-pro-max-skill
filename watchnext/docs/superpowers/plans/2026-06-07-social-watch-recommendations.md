# Social Watch & Recommendations (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn WatchNext from an empty shell into a working social app: log titles from the real TMDB catalog into a personal library, connect with friends via mutual requests, view friends' libraries and activity, and send/receive title recommendations — with real TMDB posters everywhere.

**Architecture:** A thin TMDB service (direct v4 API calls, normalized to app types, wrapped in React Query) feeds search/detail/posters. Three new RLS-protected Supabase tables (`watchlist`, `friendships`, `recommendations`) hold social state. Pure-logic libraries (normalization, friend-state derivation, feed merge, rec→watchlist mapping) are unit-tested with Jest; data-access service modules and Expo Router screens are implemented and manually verified.

**Tech Stack:** Expo SDK 54 (expo-router v6 ~6.0.24, react-native 0.81.5, react 19.1.0), TypeScript, Supabase (Postgres + RLS), `@tanstack/react-query`, `@expo/vector-icons` (Ionicons), TMDB v4 API, Jest + jest-expo.

**Spec:** `docs/superpowers/specs/2026-06-07-social-watch-recommendations-design.md`

**Supabase project_id:** `thwkgybnwiputfgnkwhn`

---

## Conventions (read before starting)

- **Pure logic = TDD.** Files in `src/lib/` and `src/types/` mapping/derivation logic get a failing test first (mirror `__tests__/friendCode.test.ts`: plain `test(...)` + `expect`, import from `../src/...`).
- **Data layers & screens = implement + manually verify.** Supabase-client and React-Query/UI code is NOT unit-tested (the repo has no mock harness for the Supabase client chain; adding one is out of scope). Verify by running the app.
- **Migrations** live in `supabase/migrations/NNNN_*.sql` (next number is `0002`). For each migration task: (1) write the `.sql` file for version control, (2) apply it to the remote project via the Supabase MCP `apply_migration` tool (name = file basename without extension, query = file contents), (3) confirm with `list_migrations` / `list_tables`.
- **Posters everywhere:** every rendered title uses `posterUrl(posterPath)`; a neutral placeholder shows only when the path is null. `poster_path` is persisted on `watchlist` and `recommendations` rows so lists never need an extra TMDB fetch.
- **TMDB token:** `EXPO_PUBLIC_TMDB_TOKEN` in `watchnext/.env` (gitignored). The service throws `"TMDB not configured"` when it is missing so screens can show a friendly message instead of crashing.
- **Commit after every task.** Never commit `.env`.

## File Structure

**Create:**
- `src/types/tmdb.ts` — `MediaType`, `Title`, `TitleDetail`.
- `src/lib/tmdbNormalize.ts` — `posterUrl`, `normalizeSearchItem/Results`, `normalizeDetail` (pure).
- `src/services/tmdb.ts` — `searchTitles`, `getTrending`, `getTitleDetails` (fetch + normalize).
- `src/lib/friendsLogic.ts` — `deriveFriendIds`, `deriveIncomingRequests`, `friendshipWith` (pure).
- `src/lib/feedLogic.ts` — `FeedItem`, `buildFeed` (pure).
- `src/lib/recommendLogic.ts` — `recToWatchlistInsert` (pure).
- `src/services/watchlist.ts`, `src/services/friends.ts`, `src/services/recommendations.ts`, `src/services/feed.ts` — data layers.
- `src/components/PosterImage.tsx`, `src/components/TitleRow.tsx` — shared UI.
- `supabase/migrations/0002_watchlist.sql`, `0003_friendships.sql`, `0004_recommendations.sql`.
- `app/title/[mediaType]/[id].tsx` — title detail.
- `app/requests.tsx` — incoming friend requests.
- `app/friends/add.tsx` — add friend (username search / friend code).
- `app/user/[id].tsx` — friend profile.
- `app/recommend/[mediaType]/[id].tsx` — send recommendation.
- Tests: `__tests__/tmdbNormalize.test.ts`, `__tests__/tmdb.test.ts`, `__tests__/friendsLogic.test.ts`, `__tests__/feedLogic.test.ts`, `__tests__/recommendLogic.test.ts`.

**Modify:**
- `src/types/db.ts` — add `WatchStatus`, `WatchlistEntry`, `FriendshipStatus`, `Friendship`, `RecommendationStatus`, `Recommendation`.
- `app/(tabs)/_layout.tsx` — retitle tabs to Feed · Library · Add · Recs · Profile; add envelope header button (with unread badge) on Feed.
- `app/(tabs)/for-you.tsx` — Feed (friend activity).
- `app/(tabs)/watchlist.tsx` — Library with status filter.
- `app/(tabs)/add.tsx` — TMDB search.
- `app/(tabs)/inbox.tsx` — Recs (received recommendations).
- `app/(tabs)/profile.tsx` — username, friend code, stats, friends list, add-friend entry, sign out.

---

## Group A — TMDB foundation

### Task 1: TMDB normalized types

**Files:**
- Create: `src/types/tmdb.ts`

- [ ] **Step 1: Create the types**

```ts
export type MediaType = "movie" | "tv";

export type Title = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  rating: number | null;
};

export type TitleDetail = Title & {
  overview: string;
  genres: string[];
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/tmdb.ts
git commit -m "feat: add TMDB normalized types"
```

---

### Task 2: TMDB normalization helpers (TDD)

**Files:**
- Create: `src/lib/tmdbNormalize.ts`
- Test: `__tests__/tmdbNormalize.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  posterUrl,
  normalizeSearchItem,
  normalizeSearchResults,
  normalizeDetail,
} from "../src/lib/tmdbNormalize";

test("posterUrl builds a CDN url and handles null", () => {
  expect(posterUrl("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w500/abc.jpg");
  expect(posterUrl("/abc.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  expect(posterUrl(null)).toBeNull();
});

test("normalizeSearchItem maps a movie and rounds rating", () => {
  const t = normalizeSearchItem({
    media_type: "movie",
    id: 1,
    title: "Dune: Part Two",
    release_date: "2024-03-01",
    poster_path: "/d.jpg",
    vote_average: 8.234,
  });
  expect(t).toEqual({
    tmdbId: 1,
    mediaType: "movie",
    title: "Dune: Part Two",
    year: "2024",
    posterPath: "/d.jpg",
    rating: 8.2,
  });
});

test("normalizeSearchItem maps a tv show using name/first_air_date", () => {
  const t = normalizeSearchItem({
    media_type: "tv",
    id: 2,
    name: "Severance",
    first_air_date: "2022-02-18",
    poster_path: null,
    vote_average: 0,
  });
  expect(t).toEqual({
    tmdbId: 2,
    mediaType: "tv",
    title: "Severance",
    year: "2022",
    posterPath: null,
    rating: null,
  });
});

test("normalizeSearchItem drops people and unknown media types", () => {
  expect(normalizeSearchItem({ media_type: "person", id: 3, name: "Someone" })).toBeNull();
});

test("normalizeSearchResults filters non-movie/tv and missing titles", () => {
  const out = normalizeSearchResults({
    results: [
      { media_type: "movie", id: 1, title: "A", release_date: "2020-01-01", vote_average: 5 },
      { media_type: "person", id: 2, name: "P" },
      { media_type: "tv", id: 3 }, // no name → dropped
    ],
  });
  expect(out.map((t) => t.tmdbId)).toEqual([1]);
});

test("normalizeDetail includes overview and genre names", () => {
  const d = normalizeDetail(
    {
      id: 9,
      title: "Oppenheimer",
      release_date: "2023-07-21",
      poster_path: "/o.jpg",
      vote_average: 8.1,
      overview: "A physicist...",
      genres: [{ id: 1, name: "Drama" }, { id: 2, name: "History" }],
    },
    "movie"
  );
  expect(d).toEqual({
    tmdbId: 9,
    mediaType: "movie",
    title: "Oppenheimer",
    year: "2023",
    posterPath: "/o.jpg",
    rating: 8.1,
    overview: "A physicist...",
    genres: ["Drama", "History"],
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tmdbNormalize -t posterUrl`
Expected: FAIL ("Cannot find module" / function not defined).

- [ ] **Step 3: Implement**

```ts
import type { MediaType, Title, TitleDetail } from "../types/tmdb";

const IMAGE_BASE = "https://image.tmdb.org/t/p";

export function posterUrl(path: string | null, size = "w500"): string | null {
  if (!path) return null;
  return `${IMAGE_BASE}/${size}${path}`;
}

function yearFrom(date: string | null | undefined): string | null {
  if (!date) return null;
  const y = date.slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

function roundRating(v: number | null | undefined): number | null {
  if (v === null || v === undefined || v === 0) return null;
  return Math.round(v * 10) / 10;
}

export function normalizeSearchItem(raw: any): Title | null {
  const mediaType = raw?.media_type as MediaType;
  if (mediaType !== "movie" && mediaType !== "tv") return null;
  const name = mediaType === "movie" ? raw.title : raw.name;
  if (!name) return null;
  const date = mediaType === "movie" ? raw.release_date : raw.first_air_date;
  return {
    tmdbId: raw.id,
    mediaType,
    title: name,
    year: yearFrom(date),
    posterPath: raw.poster_path ?? null,
    rating: roundRating(raw.vote_average),
  };
}

export function normalizeSearchResults(raw: any): Title[] {
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return results
    .map(normalizeSearchItem)
    .filter((t: Title | null): t is Title => t !== null);
}

export function normalizeDetail(raw: any, mediaType: MediaType): TitleDetail {
  const name = mediaType === "movie" ? raw.title : raw.name;
  const date = mediaType === "movie" ? raw.release_date : raw.first_air_date;
  return {
    tmdbId: raw.id,
    mediaType,
    title: name,
    year: yearFrom(date),
    posterPath: raw.poster_path ?? null,
    rating: roundRating(raw.vote_average),
    overview: raw.overview ?? "",
    genres: Array.isArray(raw.genres) ? raw.genres.map((g: any) => g.name) : [],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tmdbNormalize`
Expected: PASS (all 6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tmdbNormalize.ts __tests__/tmdbNormalize.test.ts
git commit -m "feat: add TMDB normalization helpers"
```

---

### Task 3: TMDB service (fetch + normalize)

**Files:**
- Create: `src/services/tmdb.ts`
- Test: `__tests__/tmdb.test.ts`

- [ ] **Step 1: Write the failing test** (mocks global `fetch`)

```ts
import { searchTitles, getTitleDetails } from "../src/services/tmdb";

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  delete process.env.EXPO_PUBLIC_TMDB_TOKEN;
});

test("searchTitles calls /search/multi with bearer auth and normalizes", async () => {
  process.env.EXPO_PUBLIC_TMDB_TOKEN = "test-token";
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [
        { media_type: "movie", id: 1, title: "Dune", release_date: "2021-01-01", vote_average: 8 },
      ],
    }),
  });
  global.fetch = fetchMock as any;

  const out = await searchTitles("dune");

  const [url, opts] = fetchMock.mock.calls[0];
  expect(url).toContain("https://api.themoviedb.org/3/search/multi");
  expect(url).toContain("query=dune");
  expect(opts.headers.Authorization).toBe("Bearer test-token");
  expect(out).toEqual([
    { tmdbId: 1, mediaType: "movie", title: "Dune", year: "2021", posterPath: null, rating: 8 },
  ]);
});

test("searchTitles returns [] for blank query without fetching", async () => {
  process.env.EXPO_PUBLIC_TMDB_TOKEN = "test-token";
  const fetchMock = jest.fn();
  global.fetch = fetchMock as any;
  expect(await searchTitles("   ")).toEqual([]);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("throws 'TMDB not configured' when token missing", async () => {
  const fetchMock = jest.fn();
  global.fetch = fetchMock as any;
  await expect(getTitleDetails("movie", 1)).rejects.toThrow("TMDB not configured");
  expect(fetchMock).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tmdb.test`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { MediaType, Title, TitleDetail } from "../types/tmdb";
import { normalizeSearchResults, normalizeDetail } from "../lib/tmdbNormalize";

const TMDB_BASE = "https://api.themoviedb.org/3";

function authHeaders(): Record<string, string> {
  const token = process.env.EXPO_PUBLIC_TMDB_TOKEN;
  if (!token) throw new Error("TMDB not configured");
  return { Authorization: `Bearer ${token}`, accept: "application/json" };
}

async function tmdbGet(path: string): Promise<any> {
  const headers = authHeaders(); // throws before fetch if unconfigured
  const res = await fetch(`${TMDB_BASE}${path}`, { headers });
  if (!res.ok) throw new Error(`TMDB request failed (${res.status})`);
  return res.json();
}

export async function searchTitles(query: string): Promise<Title[]> {
  const q = query.trim();
  if (!q) return [];
  const raw = await tmdbGet(`/search/multi?include_adult=false&query=${encodeURIComponent(q)}`);
  return normalizeSearchResults(raw);
}

export async function getTrending(): Promise<Title[]> {
  const raw = await tmdbGet(`/trending/all/week`);
  return normalizeSearchResults(raw);
}

export async function getTitleDetails(mediaType: MediaType, id: number): Promise<TitleDetail> {
  const raw = await tmdbGet(`/${mediaType}/${id}`);
  return normalizeDetail(raw, mediaType);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tmdb.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Add the token to `.env` and `.env.example`**

Append to `.env` (gitignored — real token; obtain a TMDB v4 read access token from https://www.themoviedb.org/settings/api):

```
EXPO_PUBLIC_TMDB_TOKEN=your-tmdb-v4-read-access-token
```

Append the placeholder line to `.env.example` (committed):

```
EXPO_PUBLIC_TMDB_TOKEN=your-tmdb-v4-read-access-token
```

- [ ] **Step 6: Commit**

```bash
git add src/services/tmdb.ts __tests__/tmdb.test.ts .env.example
git commit -m "feat: add TMDB service (search, trending, details)"
```

---

### Task 4: Social DB types

**Files:**
- Modify: `src/types/db.ts`

- [ ] **Step 1: Append the new types** (keep the existing `Profile` type at the top)

```ts
export type WatchStatus = "want" | "watching" | "watched";

export type WatchlistEntry = {
  id: string;
  user_id: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  status: WatchStatus;
  added_at: string;
};

export type FriendshipStatus = "pending" | "accepted";

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
};

export type RecommendationStatus = "pending" | "accepted" | "dismissed";

export type Recommendation = {
  id: string;
  from_user: string;
  to_user: string;
  tmdb_id: number;
  media_type: "movie" | "tv";
  title: string;
  poster_path: string | null;
  note: string | null;
  status: RecommendationStatus;
  created_at: string;
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/db.ts
git commit -m "feat: add watchlist/friendship/recommendation db types"
```

---

## Group B — Library (TMDB content into your own list)

### Task 5: Shared poster + title-row components

**Files:**
- Create: `src/components/PosterImage.tsx`
- Create: `src/components/TitleRow.tsx`

- [ ] **Step 1: Create `PosterImage.tsx`**

```tsx
import { Image, View, Text, StyleSheet } from "react-native";
import { posterUrl } from "../lib/tmdbNormalize";

export function PosterImage({
  path,
  width,
  height,
  radius = 8,
}: {
  path: string | null;
  width: number;
  height: number;
  radius?: number;
}) {
  const uri = posterUrl(path);
  if (!uri) {
    return (
      <View style={[styles.placeholder, { width, height, borderRadius: radius }]}>
        <Text style={styles.placeholderText}>No image</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width, height, borderRadius: radius }} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: "#e6e6ef", alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 9, color: "#9a9aab" },
});
```

- [ ] **Step 2: Create `TitleRow.tsx`**

```tsx
import { Pressable, View, Text, StyleSheet } from "react-native";
import { PosterImage } from "./PosterImage";
import type { MediaType } from "../types/tmdb";

export function TitleRow({
  title,
  subtitle,
  mediaType,
  posterPath,
  onPress,
}: {
  title: string;
  subtitle?: string;
  mediaType: MediaType;
  posterPath: string | null;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <PosterImage path={posterPath} width={46} height={68} />
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
        <View style={styles.pill}>
          <Text style={styles.pillText}>{mediaType === "movie" ? "MOVIE" : "TV"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, marginBottom: 14, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, color: "#888", marginTop: 2 },
  pill: { alignSelf: "flex-start", marginTop: 4, backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  pillText: { fontSize: 9, color: "#5b6cff", fontWeight: "600" },
});
```

- [ ] **Step 3: Type-check & commit**

Run: `npx tsc --noEmit` (expect no errors).

```bash
git add src/components/PosterImage.tsx src/components/TitleRow.tsx
git commit -m "feat: add PosterImage and TitleRow components"
```

---

### Task 6: `watchlist` table + RLS migration

**Files:**
- Create: `supabase/migrations/0002_watchlist.sql`

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Apply via Supabase MCP**

Call `apply_migration` with `project_id="thwkgybnwiputfgnkwhn"`, `name="0002_watchlist"`, `query=`<contents of the file>.

- [ ] **Step 3: Verify**

Call `list_tables` (schema `public`) and confirm `watchlist` exists with the columns above. Call `get_advisors` (type `security`) and confirm no new "RLS disabled" warnings for `watchlist`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_watchlist.sql
git commit -m "feat: add watchlist table with owner RLS"
```

---

### Task 7: Watchlist data layer

**Files:**
- Create: `src/services/watchlist.ts`

- [ ] **Step 1: Implement**

```ts
import { supabase } from "./supabase";
import type { Title, MediaType } from "../types/tmdb";
import type { WatchlistEntry, WatchStatus } from "../types/db";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getLibrary(userId?: string): Promise<WatchlistEntry[]> {
  const uid = userId ?? (await currentUserId());
  if (!uid) return [];
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", uid)
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data as WatchlistEntry[]) ?? [];
}

export async function getLibraryEntry(tmdbId: number, mediaType: MediaType): Promise<WatchlistEntry | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", uid)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType)
    .maybeSingle();
  if (error) throw error;
  return (data as WatchlistEntry) ?? null;
}

export async function addToLibrary(title: Title, status: WatchStatus): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("watchlist").upsert(
    {
      user_id: uid,
      tmdb_id: title.tmdbId,
      media_type: title.mediaType,
      title: title.title,
      poster_path: title.posterPath,
      status,
    },
    { onConflict: "user_id,tmdb_id,media_type" }
  );
  if (error) throw error;
}

export async function updateStatus(entryId: string, status: WatchStatus): Promise<void> {
  const { error } = await supabase.from("watchlist").update({ status }).eq("id", entryId);
  if (error) throw error;
}

export async function removeFromLibrary(entryId: string): Promise<void> {
  const { error } = await supabase.from("watchlist").delete().eq("id", entryId);
  if (error) throw error;
}
```

- [ ] **Step 2: Type-check & commit**

Run: `npx tsc --noEmit` (expect no errors). Manual verification happens in Tasks 8–10.

```bash
git add src/services/watchlist.ts
git commit -m "feat: add watchlist data layer"
```

---

### Task 8: Add (search) screen

**Files:**
- Modify: `app/(tabs)/add.tsx`

- [ ] **Step 1: Replace the placeholder with the search screen**

```tsx
import { useState } from "react";
import { View, TextInput, FlatList, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { searchTitles } from "../../src/services/tmdb";
import { TitleRow } from "../../src/components/TitleRow";

export default function AddScreen() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const enabled = q.trim().length > 0;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tmdb-search", q.trim()],
    queryFn: () => searchTitles(q),
    enabled,
  });

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search movies & shows…"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {isError ? (
        <Text style={styles.msg}>{(error as Error).message}</Text>
      ) : isLoading && enabled ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : !enabled ? (
        <Text style={styles.msg}>Search for something to add to your library.</Text>
      ) : (data ?? []).length === 0 ? (
        <Text style={styles.msg}>No results.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => `${t.mediaType}:${t.tmdbId}`}
          renderItem={({ item }) => (
            <TitleRow
              title={item.title}
              subtitle={[item.year, item.rating ? `⭐ ${item.rating}` : null].filter(Boolean).join(" · ")}
              mediaType={item.mediaType}
              posterPath={item.posterPath}
              onPress={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
```

- [ ] **Step 2: Manually verify**

Run `npx expo start`, open the app, go to the **Add** tab, type "dune". Expect a list of results with **real posters**, titles, year · ⭐ rating, and a MOVIE/TV pill. Tapping a row navigates (next task wires the detail screen).

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/add.tsx"
git commit -m "feat: TMDB search on Add tab"
```

---

### Task 9: Title detail screen

**Files:**
- Create: `app/title/[mediaType]/[id].tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getTitleDetails } from "../../../src/services/tmdb";
import { addToLibrary, getLibraryEntry, updateStatus } from "../../../src/services/watchlist";
import { PosterImage } from "../../../src/components/PosterImage";
import type { MediaType, TitleDetail } from "../../../src/types/tmdb";
import type { WatchStatus } from "../../../src/types/db";

const STATUSES: { key: WatchStatus; label: string }[] = [
  { key: "want", label: "Want" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
];

export default function TitleDetailScreen() {
  const { mediaType, id } = useLocalSearchParams<{ mediaType: MediaType; id: string }>();
  const tmdbId = Number(id);
  const qc = useQueryClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const detail = useQuery({
    queryKey: ["tmdb-detail", mediaType, tmdbId],
    queryFn: () => getTitleDetails(mediaType as MediaType, tmdbId),
  });
  const entry = useQuery({
    queryKey: ["library-entry", mediaType, tmdbId],
    queryFn: () => getLibraryEntry(tmdbId, mediaType as MediaType),
  });

  async function setStatus(status: WatchStatus, d: TitleDetail) {
    try {
      setSaving(true);
      if (entry.data) await updateStatus(entry.data.id, status);
      else await addToLibrary(d, status);
      await qc.invalidateQueries({ queryKey: ["library-entry", mediaType, tmdbId] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert("Couldn't save", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: detail.data?.title ?? "Title" }} />
      {detail.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : detail.isError ? (
        <Text style={styles.msg}>{(detail.error as Error).message}</Text>
      ) : (
        (() => {
          const d = detail.data!;
          const current = entry.data?.status ?? null;
          return (
            <>
              <PosterImage path={d.posterPath} width={140} height={210} radius={12} />
              <Text style={styles.title}>{d.title}</Text>
              <Text style={styles.sub}>
                {[d.year, d.mediaType === "movie" ? "Movie" : "TV", d.rating ? `⭐ ${d.rating}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </Text>
              {d.genres.length > 0 ? <Text style={styles.genres}>{d.genres.join(" · ")}</Text> : null}
              {d.overview ? <Text style={styles.overview}>{d.overview}</Text> : null}

              <Text style={styles.section}>Add to library</Text>
              <View style={styles.segRow}>
                {STATUSES.map((s) => (
                  <Pressable
                    key={s.key}
                    disabled={saving}
                    style={[styles.chip, current === s.key && styles.chipOn]}
                    onPress={() => setStatus(s.key, d)}
                  >
                    <Text style={[styles.chipText, current === s.key && styles.chipTextOn]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Pressable style={styles.btn} onPress={() => router.push(`/recommend/${d.mediaType}/${d.tmdbId}`)}>
                <Text style={styles.btnText}>Recommend to a friend</Text>
              </Pressable>
            </>
          );
        })()
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, alignItems: "flex-start" },
  title: { fontSize: 22, fontWeight: "700", marginTop: 14 },
  sub: { fontSize: 13, color: "#888", marginTop: 4 },
  genres: { fontSize: 12, color: "#5b6cff", marginTop: 8 },
  overview: { fontSize: 14, color: "#444", lineHeight: 21, marginTop: 12 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 22, marginBottom: 8 },
  segRow: { flexDirection: "row", gap: 8 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 13, color: "#666", fontWeight: "600" },
  chipTextOn: { color: "#fff" },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20, marginTop: 24, alignSelf: "stretch", alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  msg: { color: "#888", fontSize: 13, margin: 24, textAlign: "center" },
});
```

- [ ] **Step 2: Manually verify**

From Add, tap a result. Expect a large poster, overview, genres, rating; tapping **Want/Watching/Watched** highlights the choice and persists it (re-open the title — the chip stays selected). The "Recommend to a friend" button navigates (wired in Task 18; a missing-route warning here is fine for now).

- [ ] **Step 3: Commit**

```bash
git add "app/title/[mediaType]/[id].tsx"
git commit -m "feat: title detail with add-to-library status picker"
```

---

### Task 10: Library tab (status filter)

**Files:**
- Modify: `app/(tabs)/watchlist.tsx`

- [ ] **Step 1: Replace the placeholder with the library list**

```tsx
import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getLibrary } from "../../src/services/watchlist";
import { TitleRow } from "../../src/components/TitleRow";
import type { WatchStatus } from "../../src/types/db";

const FILTERS: { key: "all" | WatchStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "want", label: "Want" },
  { key: "watching", label: "Watching" },
  { key: "watched", label: "Watched" },
];

const STATUS_LABEL: Record<WatchStatus, string> = {
  want: "Want to watch",
  watching: "Watching",
  watched: "Watched ✓",
};

export default function LibraryScreen() {
  const [filter, setFilter] = useState<"all" | WatchStatus>("all");
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["library"], queryFn: () => getLibrary() });
  const rows = (data ?? []).filter((e) => filter === "all" || e.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            style={[styles.chip, filter === f.key && styles.chipOn]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextOn]}>{f.label}</Text>
          </Pressable>
        ))}
      </View>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <Text style={styles.msg}>Nothing here yet. Use the Add tab to find something to watch.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => (
            <TitleRow
              title={item.title}
              subtitle={STATUS_LABEL[item.status]}
              mediaType={item.media_type}
              posterPath={item.poster_path}
              onPress={() => router.push(`/title/${item.media_type}/${item.tmdb_id}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 14 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 12, color: "#666" },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
```

- [ ] **Step 2: Manually verify**

Add a couple of titles with different statuses, then open the **Library** (currently still labeled "Watchlist"; retitled in Task 26) tab. Expect your titles with posters; the All/Want/Watching/Watched chips filter the list. Tapping a row opens its detail.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/watchlist.tsx"
git commit -m "feat: Library tab with status filter"
```

---

## Group C — Friends (mutual connections)

### Task 11: `friendships` table + RLS + profile/watchlist friend-read + friend-code RPC

**Files:**
- Create: `supabase/migrations/0003_friendships.sql`

> This migration also (a) adds the deferred friend-read policy to `watchlist`, (b) widens `profiles` SELECT so you can read profiles of anyone you have a friendship row with (needed to display friends AND incoming requesters — including private accounts), and (c) adds a `SECURITY DEFINER` RPC so private users stay addable by exact friend code.

- [ ] **Step 1: Write the migration file**

```sql
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
grant execute on function public.lookup_user_by_friend_code(text) to authenticated;
```

- [ ] **Step 2: Apply via Supabase MCP**

Call `apply_migration` with `project_id="thwkgybnwiputfgnkwhn"`, `name="0003_friendships"`, `query=`<file contents>.

- [ ] **Step 3: Verify**

`list_tables` shows `friendships`. `get_advisors` (security) shows no new RLS-disabled warnings. Sanity-check the RPC:

```sql
select * from public.lookup_user_by_friend_code('ZZZZZZZZ');
```
Expected: 0 rows (no such code) and no error.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0003_friendships.sql
git commit -m "feat: friendships table, friend-read policies, friend-code RPC"
```

---

### Task 12: Friend-state derivation helpers (TDD)

**Files:**
- Create: `src/lib/friendsLogic.ts`
- Test: `__tests__/friendsLogic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { deriveFriendIds, deriveIncomingRequests, friendshipWith } from "../src/lib/friendsLogic";
import type { Friendship } from "../src/types/db";

const me = "me";
const rows: Friendship[] = [
  { id: "1", requester_id: "me", addressee_id: "a", status: "accepted", created_at: "t1" },
  { id: "2", requester_id: "b", addressee_id: "me", status: "accepted", created_at: "t2" },
  { id: "3", requester_id: "c", addressee_id: "me", status: "pending", created_at: "t3" },
  { id: "4", requester_id: "me", addressee_id: "d", status: "pending", created_at: "t4" },
  { id: "5", requester_id: "x", addressee_id: "y", status: "accepted", created_at: "t5" },
];

test("deriveFriendIds returns the other side of accepted friendships involving me", () => {
  expect(deriveFriendIds(rows, me).sort()).toEqual(["a", "b"]);
});

test("deriveIncomingRequests returns only pending rows addressed to me", () => {
  expect(deriveIncomingRequests(rows, me).map((r) => r.id)).toEqual(["3"]);
});

test("friendshipWith finds a row in either direction or null", () => {
  expect(friendshipWith(rows, me, "a")?.id).toBe("1");
  expect(friendshipWith(rows, me, "b")?.id).toBe("2");
  expect(friendshipWith(rows, me, "zzz")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest friendsLogic`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { Friendship } from "../types/db";

export function deriveFriendIds(rows: Friendship[], myId: string): string[] {
  return rows
    .filter((r) => r.status === "accepted" && (r.requester_id === myId || r.addressee_id === myId))
    .map((r) => (r.requester_id === myId ? r.addressee_id : r.requester_id));
}

export function deriveIncomingRequests(rows: Friendship[], myId: string): Friendship[] {
  return rows.filter((r) => r.status === "pending" && r.addressee_id === myId);
}

export function friendshipWith(rows: Friendship[], myId: string, otherId: string): Friendship | null {
  return (
    rows.find(
      (r) =>
        (r.requester_id === myId && r.addressee_id === otherId) ||
        (r.requester_id === otherId && r.addressee_id === myId)
    ) ?? null
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest friendsLogic`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/friendsLogic.ts __tests__/friendsLogic.test.ts
git commit -m "feat: friend-state derivation helpers"
```

---

### Task 13: Friends data layer

**Files:**
- Create: `src/services/friends.ts`

- [ ] **Step 1: Implement**

```ts
import { supabase } from "./supabase";
import type { Friendship, Profile } from "../types/db";
import { deriveFriendIds, deriveIncomingRequests } from "../lib/friendsLogic";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function getMyFriendshipRows(): Promise<Friendship[]> {
  const { data, error } = await supabase.from("friendships").select("*");
  if (error) throw error;
  return (data as Friendship[]) ?? [];
}

export async function searchUsers(q: string): Promise<Profile[]> {
  const query = q.trim();
  if (!query) return [];
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("username", `%${query}%`)
    .limit(20);
  if (error) throw error;
  return ((data as Profile[]) ?? []).filter((p) => p.id !== uid);
}

export async function lookupByFriendCode(
  code: string
): Promise<{ id: string; username: string; avatar_url: string | null } | null> {
  const { data, error } = await supabase.rpc("lookup_user_by_friend_code", { code: code.trim() });
  if (error) throw error;
  const rows = (data as { id: string; username: string; avatar_url: string | null }[]) ?? [];
  return rows[0] ?? null;
}

export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase
    .from("friendships")
    .insert({ requester_id: uid, addressee_id: addresseeId, status: "pending" });
  if (error) throw error;
}

export async function acceptRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
  if (error) throw error;
}

export async function declineRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export async function unfriend(friendshipId: string): Promise<void> {
  const { error } = await supabase.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export async function getFriends(): Promise<Profile[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const ids = deriveFriendIds(await getMyFriendshipRows(), uid);
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("profiles").select("*").in("id", ids);
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export type IncomingRequest = { friendship: Friendship; profile: Profile | null };

export async function getIncomingRequests(): Promise<IncomingRequest[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const incoming = deriveIncomingRequests(await getMyFriendshipRows(), uid);
  if (incoming.length === 0) return [];
  const requesterIds = incoming.map((r) => r.requester_id);
  const { data, error } = await supabase.from("profiles").select("*").in("id", requesterIds);
  if (error) throw error;
  const profiles = (data as Profile[]) ?? [];
  return incoming.map((f) => ({
    friendship: f,
    profile: profiles.find((p) => p.id === f.requester_id) ?? null,
  }));
}

export async function getFriendStats(
  userId: string
): Promise<{ want: number; watching: number; watched: number }> {
  const { data, error } = await supabase.from("watchlist").select("status").eq("user_id", userId);
  if (error) throw error;
  const rows = (data as { status: string }[]) ?? [];
  return {
    want: rows.filter((r) => r.status === "want").length,
    watching: rows.filter((r) => r.status === "watching").length,
    watched: rows.filter((r) => r.status === "watched").length,
  };
}
```

- [ ] **Step 2: Type-check & commit**

Run: `npx tsc --noEmit` (expect no errors). Manual verification in Tasks 14–17.

```bash
git add src/services/friends.ts
git commit -m "feat: friends data layer"
```

---

### Task 14: Add-friend screen

**Files:**
- Create: `app/friends/add.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Stack } from "expo-router";
import { searchUsers, lookupByFriendCode, sendFriendRequest } from "../../src/services/friends";
import { isValidFriendCode } from "../../src/lib/friendCode";
import type { Profile } from "../../src/types/db";

type Found = { id: string; username: string };

export default function AddFriendScreen() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<Record<string, boolean>>({});

  async function runSearch() {
    const value = q.trim();
    if (!value) return;
    try {
      setBusy(true);
      if (isValidFriendCode(value.toUpperCase())) {
        const u = await lookupByFriendCode(value.toUpperCase());
        setResults(u ? [{ id: u.id, username: u.username }] : []);
      } else {
        const profiles: Profile[] = await searchUsers(value);
        setResults(profiles.map((p) => ({ id: p.id, username: p.username })));
      }
    } catch (e) {
      Alert.alert("Search failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function send(userId: string) {
    try {
      await sendFriendRequest(userId);
      setSent((s) => ({ ...s, [userId]: true }));
    } catch (e) {
      Alert.alert("Couldn't send request", (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Add friend" }} />
      <TextInput
        style={styles.input}
        placeholder="Username or friend code"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={runSearch}
        returnKeyType="search"
      />
      <Pressable style={styles.btn} onPress={runSearch}>
        <Text style={styles.btnText}>Search</Text>
      </Pressable>

      {busy ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          style={{ marginTop: 16 }}
          data={results}
          keyExtractor={(u) => u.id}
          ListEmptyComponent={<Text style={styles.msg}>Search by username, or paste a friend code.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.username}>@{item.username}</Text>
              {sent[item.id] ? (
                <Text style={styles.sentText}>Requested</Text>
              ) : (
                <Pressable style={styles.smallBtn} onPress={() => send(item.id)}>
                  <Text style={styles.smallBtnText}>Add</Text>
                </Pressable>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  input: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 10 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  username: { fontSize: 15, fontWeight: "600" },
  smallBtn: { backgroundColor: "#5b6cff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  smallBtnText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  sentText: { color: "#888", fontSize: 12 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
```

- [ ] **Step 2: Manually verify** (needs a second account)

Create a second account on another simulator/device (or reuse one). From account A open this screen (entry point added in Task 16), search account B's username, tap **Add** → shows "Requested". Verify with MCP:

```sql
select requester_id, addressee_id, status from public.friendships order by created_at desc limit 3;
```
Expect a `pending` row. Also test the friend-code path (paste B's 8-char code).

- [ ] **Step 3: Commit**

```bash
git add app/friends/add.tsx
git commit -m "feat: add-friend screen (username search + friend code)"
```

---

### Task 15: Requests screen

**Files:**
- Create: `app/requests.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getIncomingRequests, acceptRequest, declineRequest } from "../src/services/friends";

export default function RequestsScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["incoming-requests"], queryFn: getIncomingRequests });

  async function respond(action: () => Promise<void>) {
    try {
      await action();
      await qc.invalidateQueries({ queryKey: ["incoming-requests"] });
      await qc.invalidateQueries({ queryKey: ["friends"] });
    } catch (e) {
      Alert.alert("Action failed", (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Friend requests" }} />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(r) => r.friendship.id}
          ListEmptyComponent={<Text style={styles.msg}>No pending requests.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.username}>@{item.profile?.username ?? "someone"}</Text>
              <View style={styles.actions}>
                <Pressable style={styles.accept} onPress={() => respond(() => acceptRequest(item.friendship.id))}>
                  <Text style={styles.acceptText}>Accept</Text>
                </Pressable>
                <Pressable style={styles.decline} onPress={() => respond(() => declineRequest(item.friendship.id))}>
                  <Text style={styles.declineText}>Decline</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  username: { fontSize: 15, fontWeight: "600" },
  actions: { flexDirection: "row", gap: 8 },
  accept: { backgroundColor: "#5b6cff", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  acceptText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  decline: { backgroundColor: "#f0f0f3", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 },
  declineText: { color: "#333", fontWeight: "600", fontSize: 12 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
```

- [ ] **Step 2: Manually verify**

On account B (who received A's request), open this screen (entry = envelope on Feed, Task 26; for now navigate via the URL `/requests` from the Profile add-friend area or a temporary button). Tap **Accept**; confirm with MCP the row flips to `accepted`. Account A should now appear in B's friends and vice versa.

- [ ] **Step 3: Commit**

```bash
git add app/requests.tsx
git commit -m "feat: incoming friend requests screen"
```

---

### Task 16: Profile tab (identity, stats, friends, add-friend, sign out)

**Files:**
- Modify: `app/(tabs)/profile.tsx`

- [ ] **Step 1: Replace the profile screen**

```tsx
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../src/auth/AuthProvider";
import { getFriends, getFriendStats } from "../../src/services/friends";

export default function ProfileScreen() {
  const { profile, session, signOut } = useAuth();
  const router = useRouter();
  const uid = session?.user.id;

  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const stats = useQuery({
    queryKey: ["my-stats", uid],
    queryFn: () => getFriendStats(uid as string),
    enabled: !!uid,
  });

  return (
    <FlatList
      style={styles.container}
      data={friends.data ?? []}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.username}>@{profile?.username ?? "you"}</Text>
          {profile?.friend_code ? <Text style={styles.code}>Friend code: {profile.friend_code}</Text> : null}

          <View style={styles.statRow}>
            <Stat n={stats.data?.watched ?? 0} label="watched" />
            <Stat n={stats.data?.watching ?? 0} label="watching" />
            <Stat n={stats.data?.want ?? 0} label="want" />
          </View>

          <Pressable style={styles.btn} onPress={() => router.push("/friends/add")}>
            <Text style={styles.btnText}>Add a friend</Text>
          </Pressable>

          <Text style={styles.section}>Friends</Text>
          {friends.isLoading ? <ActivityIndicator style={{ marginTop: 12 }} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <Pressable style={styles.friendRow} onPress={() => router.push(`/user/${item.id}`)}>
          <Text style={styles.friendName}>@{item.username}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      )}
      ListEmptyComponent={
        friends.isLoading ? null : <Text style={styles.msg}>No friends yet. Add someone above.</Text>
      }
      ListFooterComponent={
        <Pressable style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      }
    />
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  username: { fontSize: 22, fontWeight: "700" },
  code: { fontSize: 13, color: "#888", marginTop: 4 },
  statRow: { flexDirection: "row", gap: 24, marginTop: 16 },
  stat: { alignItems: "flex-start" },
  statN: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#888" },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, alignItems: "center", marginTop: 18 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 22, marginBottom: 6 },
  friendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  friendName: { fontSize: 15, fontWeight: "600" },
  chevron: { fontSize: 20, color: "#bbb" },
  msg: { color: "#888", fontSize: 13, marginTop: 12 },
  signOut: { marginTop: 28, alignItems: "center" },
  signOutText: { color: "#ff3b5b", fontWeight: "600", fontSize: 14 },
});
```

- [ ] **Step 2: Manually verify**

Open **Profile**: shows your @username, friend code, your watch stats, an **Add a friend** button (opens the add-friend screen), your friends list (tapping a friend opens their profile — next task), and **Sign out**.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/profile.tsx"
git commit -m "feat: profile tab with friends, stats, friend code"
```

---

### Task 17: Friend profile screen

**Files:**
- Create: `app/user/[id].tsx`

- [ ] **Step 1: Create the screen**

```tsx
import { useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../src/services/supabase";
import { getFriendStats, unfriend } from "../../src/services/friends";
import { getLibrary } from "../../src/services/watchlist";
import { friendshipWith } from "../../src/lib/friendsLogic";
import { TitleRow } from "../../src/components/TitleRow";
import type { Friendship, Profile, WatchStatus } from "../../src/types/db";

async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Profile) ?? null;
}

async function getMyFriendships(): Promise<Friendship[]> {
  const { data, error } = await supabase.from("friendships").select("*");
  if (error) throw error;
  return (data as Friendship[]) ?? [];
}

const TABS: { key: WatchStatus; label: string }[] = [
  { key: "watched", label: "Watched" },
  { key: "watching", label: "Watching" },
  { key: "want", label: "Want" },
];

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [tab, setTab] = useState<WatchStatus>("watched");

  const profile = useQuery({ queryKey: ["profile", id], queryFn: () => getProfile(id) });
  const stats = useQuery({ queryKey: ["friend-stats", id], queryFn: () => getFriendStats(id) });
  const library = useQuery({ queryKey: ["friend-library", id], queryFn: () => getLibrary(id) });
  const friendships = useQuery({ queryKey: ["friendships-raw"], queryFn: getMyFriendships });

  const rows = (library.data ?? []).filter((e) => e.status === tab);

  async function doUnfriend() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const me = auth.user?.id ?? "";
      const f = friendshipWith(friendships.data ?? [], me, id);
      if (!f) return;
      await unfriend(f.id);
      await qc.invalidateQueries({ queryKey: ["friends"] });
      router.back();
    } catch (e) {
      Alert.alert("Couldn't unfriend", (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: profile.data ? `@${profile.data.username}` : "Profile" }} />
      {profile.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <>
          <View style={styles.statRow}>
            <Stat n={stats.data?.watched ?? 0} label="watched" />
            <Stat n={stats.data?.watching ?? 0} label="watching" />
            <Stat n={stats.data?.want ?? 0} label="want" />
          </View>

          <View style={styles.btnRow}>
            <Pressable
              style={styles.btn}
              onPress={() => router.push(`/recommend/picker?to=${id}`)}
            >
              <Text style={styles.btnText}>Recommend a title</Text>
            </Pressable>
            <Pressable style={styles.ghost} onPress={doUnfriend}>
              <Text style={styles.ghostText}>Unfriend</Text>
            </Pressable>
          </View>

          <View style={styles.tabs}>
            {TABS.map((t) => (
              <Pressable key={t.key} style={[styles.chip, tab === t.key && styles.chipOn]} onPress={() => setTab(t.key)}>
                <Text style={[styles.chipText, tab === t.key && styles.chipTextOn]}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {library.isLoading ? (
            <ActivityIndicator style={{ marginTop: 16 }} />
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(e) => e.id}
              ListEmptyComponent={<Text style={styles.msg}>Nothing in “{TABS.find((t) => t.key === tab)?.label}”.</Text>}
              renderItem={({ item }) => (
                <TitleRow
                  title={item.title}
                  mediaType={item.media_type}
                  posterPath={item.poster_path}
                  onPress={() => router.push(`/title/${item.media_type}/${item.tmdb_id}`)}
                />
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statN}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  statRow: { flexDirection: "row", gap: 24 },
  stat: { alignItems: "flex-start" },
  statN: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#888" },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  btn: { flex: 1, backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  ghost: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, alignItems: "center" },
  ghostText: { color: "#333", fontWeight: "600", fontSize: 13 },
  tabs: { flexDirection: "row", gap: 8, marginTop: 18, marginBottom: 12 },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 12, color: "#666" },
  chipTextOn: { color: "#fff", fontWeight: "600" },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
```

> Note: the "Recommend a title" button routes to `/recommend/picker?to=<id>` — a friend-first entry that lets you search a title, then opens the send screen with this friend preselected. Both `app/recommend/picker.tsx` and the send screen `app/recommend/[mediaType]/[id].tsx` are created in Task 21. Until then, this button warns about a missing route — expected, resolved in Task 21.

- [ ] **Step 2: Manually verify**

From Profile → tap a friend. Expect their watch stats, a Watched/Watching/Want filter over **their** library (posters visible), and Unfriend. (Recommend button verified in Task 21.) Confirm a **private** friend still loads here (validates the `read connected profiles` policy).

- [ ] **Step 3: Commit**

```bash
git add "app/user/[id].tsx"
git commit -m "feat: friend profile with their library by status"
```

---

## Group D — Recommendations (send & receive)

### Task 18: `recommendations` table + RLS migration

**Files:**
- Create: `supabase/migrations/0004_recommendations.sql`

- [ ] **Step 1: Write the migration file**

```sql
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
```

- [ ] **Step 2: Apply via Supabase MCP**

Call `apply_migration` with `project_id="thwkgybnwiputfgnkwhn"`, `name="0004_recommendations"`, `query=`<file contents>.

- [ ] **Step 3: Verify**

`list_tables` shows `recommendations`; `get_advisors` (security) shows no new RLS-disabled warnings.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0004_recommendations.sql
git commit -m "feat: recommendations table with friend-gated insert RLS"
```

---

### Task 19: Recommendation→watchlist mapping (TDD)

**Files:**
- Create: `src/lib/recommendLogic.ts`
- Test: `__tests__/recommendLogic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { recToWatchlistInsert } from "../src/lib/recommendLogic";
import type { Recommendation } from "../src/types/db";

const rec: Recommendation = {
  id: "r1",
  from_user: "f",
  to_user: "me",
  tmdb_id: 42,
  media_type: "tv",
  title: "Shogun",
  poster_path: "/s.jpg",
  note: "watch it",
  status: "pending",
  created_at: "t",
};

test("recToWatchlistInsert maps a rec to a 'want' insert for the recipient", () => {
  expect(recToWatchlistInsert(rec, "me")).toEqual({
    user_id: "me",
    tmdb_id: 42,
    media_type: "tv",
    title: "Shogun",
    poster_path: "/s.jpg",
    status: "want",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest recommendLogic`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { Recommendation, WatchlistEntry } from "../types/db";

export type WatchlistInsert = Pick<
  WatchlistEntry,
  "user_id" | "tmdb_id" | "media_type" | "title" | "poster_path" | "status"
>;

export function recToWatchlistInsert(rec: Recommendation, userId: string): WatchlistInsert {
  return {
    user_id: userId,
    tmdb_id: rec.tmdb_id,
    media_type: rec.media_type,
    title: rec.title,
    poster_path: rec.poster_path,
    status: "want",
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest recommendLogic`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/lib/recommendLogic.ts __tests__/recommendLogic.test.ts
git commit -m "feat: recommendation-to-watchlist mapping"
```

---

### Task 20: Recommendations data layer

**Files:**
- Create: `src/services/recommendations.ts`

- [ ] **Step 1: Implement**

```ts
import { supabase } from "./supabase";
import type { Profile, Recommendation } from "../types/db";
import type { Title } from "../types/tmdb";
import { recToWatchlistInsert } from "../lib/recommendLogic";

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function sendRecommendation(toUserId: string, title: Title, note?: string): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const { error } = await supabase.from("recommendations").insert({
    from_user: uid,
    to_user: toUserId,
    tmdb_id: title.tmdbId,
    media_type: title.mediaType,
    title: title.title,
    poster_path: title.posterPath,
    note: note?.trim() || null,
    status: "pending",
  });
  if (error) throw error;
}

export type ReceivedRec = { rec: Recommendation; from: Profile | null };

export async function getReceived(): Promise<ReceivedRec[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("recommendations")
    .select("*")
    .eq("to_user", uid)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  const recs = (data as Recommendation[]) ?? [];
  if (recs.length === 0) return [];
  const senderIds = [...new Set(recs.map((r) => r.from_user))];
  const { data: profs, error: pErr } = await supabase.from("profiles").select("*").in("id", senderIds);
  if (pErr) throw pErr;
  const profiles = (profs as Profile[]) ?? [];
  return recs.map((rec) => ({ rec, from: profiles.find((p) => p.id === rec.from_user) ?? null }));
}

export async function acceptRecommendation(rec: Recommendation): Promise<void> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Not signed in");
  const insert = recToWatchlistInsert(rec, uid);
  const { error: upsertErr } = await supabase
    .from("watchlist")
    .upsert(insert, { onConflict: "user_id,tmdb_id,media_type" });
  if (upsertErr) throw upsertErr;
  const { error } = await supabase.from("recommendations").update({ status: "accepted" }).eq("id", rec.id);
  if (error) throw error;
}

export async function dismissRecommendation(recId: string): Promise<void> {
  const { error } = await supabase.from("recommendations").update({ status: "dismissed" }).eq("id", recId);
  if (error) throw error;
}
```

- [ ] **Step 2: Type-check & commit**

Run: `npx tsc --noEmit` (expect no errors). Manual verification in Tasks 21–22.

```bash
git add src/services/recommendations.ts
git commit -m "feat: recommendations data layer"
```

---

### Task 21: Send-recommendation flow (picker + send screen)

**Files:**
- Create: `app/recommend/picker.tsx`
- Create: `app/recommend/[mediaType]/[id].tsx`

- [ ] **Step 1: Create the picker** (`app/recommend/picker.tsx`) — search a title, carry the `to` friend through

```tsx
import { useState } from "react";
import { View, TextInput, FlatList, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { searchTitles } from "../../src/services/tmdb";
import { TitleRow } from "../../src/components/TitleRow";

export default function RecommendPickerScreen() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  const [q, setQ] = useState("");
  const router = useRouter();
  const enabled = q.trim().length > 0;
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tmdb-search", q.trim()],
    queryFn: () => searchTitles(q),
    enabled,
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Pick a title" }} />
      <TextInput
        style={styles.search}
        placeholder="Search movies & shows…"
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {isError ? (
        <Text style={styles.msg}>{(error as Error).message}</Text>
      ) : isLoading && enabled ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : !enabled ? (
        <Text style={styles.msg}>Search for a title to recommend.</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(t) => `${t.mediaType}:${t.tmdbId}`}
          renderItem={({ item }) => (
            <TitleRow
              title={item.title}
              subtitle={[item.year, item.rating ? `⭐ ${item.rating}` : null].filter(Boolean).join(" · ")}
              mediaType={item.mediaType}
              posterPath={item.posterPath}
              onPress={() => router.push(`/recommend/${item.mediaType}/${item.tmdbId}${to ? `?to=${to}` : ""}`)}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  search: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 14 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
```

- [ ] **Step 2: Create the send screen** (`app/recommend/[mediaType]/[id].tsx`)

```tsx
import { useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getTitleDetails } from "../../../src/services/tmdb";
import { getFriends } from "../../../src/services/friends";
import { sendRecommendation } from "../../../src/services/recommendations";
import { PosterImage } from "../../../src/components/PosterImage";
import type { MediaType } from "../../../src/types/tmdb";

export default function SendRecScreen() {
  const { mediaType, id, to } = useLocalSearchParams<{ mediaType: MediaType; id: string; to?: string }>();
  const tmdbId = Number(id);
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>(to ? { [to]: true } : {});
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const detail = useQuery({
    queryKey: ["tmdb-detail", mediaType, tmdbId],
    queryFn: () => getTitleDetails(mediaType as MediaType, tmdbId),
  });
  const friends = useQuery({ queryKey: ["friends"], queryFn: getFriends });

  function toggle(friendId: string) {
    setSelected((s) => ({ ...s, [friendId]: !s[friendId] }));
  }

  async function send() {
    const d = detail.data;
    if (!d) return;
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) {
      Alert.alert("Pick at least one friend");
      return;
    }
    try {
      setSending(true);
      for (const friendId of ids) {
        await sendRecommendation(friendId, d, note);
      }
      Alert.alert("Sent!", "Your recommendation is on its way.");
      router.back();
    } catch (e) {
      Alert.alert("Couldn't send", (e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Recommend" }} />
      {detail.isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : detail.isError ? (
        <Text style={styles.msg}>{(detail.error as Error).message}</Text>
      ) : (
        <>
          <View style={styles.titleRow}>
            <PosterImage path={detail.data!.posterPath} width={70} height={104} radius={10} />
            <View style={styles.titleMeta}>
              <Text style={styles.title}>{detail.data!.title}</Text>
              <Text style={styles.sub}>
                {[detail.data!.year, detail.data!.mediaType === "movie" ? "Movie" : "TV"].filter(Boolean).join(" · ")}
              </Text>
            </View>
          </View>

          <Text style={styles.section}>SEND TO</Text>
          <FlatList
            data={friends.data ?? []}
            keyExtractor={(p) => p.id}
            style={{ flexGrow: 0, maxHeight: 240 }}
            ListEmptyComponent={<Text style={styles.msg}>Add friends first to recommend titles.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.friendRow} onPress={() => toggle(item.id)}>
                <Text style={styles.friendName}>@{item.username}</Text>
                <View style={[styles.checkbox, selected[item.id] && styles.checkboxOn]} />
              </Pressable>
            )}
          />

          <TextInput
            style={styles.note}
            placeholder="Add a note (optional)…"
            value={note}
            onChangeText={setNote}
          />
          <Pressable style={[styles.btn, sending && { opacity: 0.6 }]} disabled={sending} onPress={send}>
            <Text style={styles.btnText}>Send recommendation</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  titleRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  titleMeta: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 12, color: "#888", marginTop: 4 },
  section: { fontSize: 11, color: "#888", marginTop: 18, marginBottom: 6, fontWeight: "700" },
  friendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#eee" },
  friendName: { fontSize: 15, fontWeight: "600" },
  checkbox: { width: 18, height: 18, borderRadius: 999, borderWidth: 2, borderColor: "#5b6cff" },
  checkboxOn: { backgroundColor: "#5b6cff" },
  note: { backgroundColor: "#f0f0f3", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, marginTop: 14 },
  btn: { backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 14 },
  btnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
```

- [ ] **Step 3: Manually verify**

Two paths, both as account A with an accepted friend B:
1. Title-first: open a title detail → **Recommend to a friend** → select B, add a note, **Send**.
2. Friend-first: Profile → B → **Recommend a title** → search & pick a title (B preselected) → **Send**.

Confirm with MCP:
```sql
select from_user, to_user, title, note, status from public.recommendations order by created_at desc limit 3;
```
Expect a `pending` row to B with your note and `poster_path` populated.

- [ ] **Step 4: Commit**

```bash
git add app/recommend/picker.tsx "app/recommend/[mediaType]/[id].tsx"
git commit -m "feat: send-recommendation picker and send screen"
```

---

### Task 22: Recs tab (received recommendations)

**Files:**
- Modify: `app/(tabs)/inbox.tsx`

- [ ] **Step 1: Replace the placeholder**

```tsx
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getReceived, acceptRecommendation, dismissRecommendation } from "../../src/services/recommendations";
import { PosterImage } from "../../src/components/PosterImage";

export default function RecsScreen() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["received-recs"], queryFn: getReceived });

  async function act(fn: () => Promise<void>) {
    try {
      await fn();
      await qc.invalidateQueries({ queryKey: ["received-recs"] });
      await qc.invalidateQueries({ queryKey: ["library"] });
    } catch (e) {
      Alert.alert("Action failed", (e as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.rec.id}
          ListEmptyComponent={
            <Text style={styles.msg}>No recommendations yet. When a friend sends you one, it shows up here.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <PosterImage path={item.rec.poster_path} width={46} height={68} />
                <View style={styles.meta}>
                  <Text style={styles.title}>{item.rec.title}</Text>
                  <Text style={styles.sub}>
                    from @{item.from?.username ?? "a friend"} · {item.rec.media_type === "movie" ? "MOVIE" : "TV"}
                  </Text>
                </View>
              </View>
              {item.rec.note ? <Text style={styles.note}>“{item.rec.note}”</Text> : null}
              <View style={styles.btnRow}>
                <Pressable style={styles.accept} onPress={() => act(() => acceptRecommendation(item.rec))}>
                  <Text style={styles.acceptText}>Add to Want</Text>
                </Pressable>
                <Pressable style={styles.dismiss} onPress={() => act(() => dismissRecommendation(item.rec.id))}>
                  <Text style={styles.dismissText}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 12, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, fontWeight: "600" },
  sub: { fontSize: 12, color: "#888", marginTop: 2 },
  note: { backgroundColor: "#f0f0f3", borderRadius: 10, padding: 10, fontSize: 12, color: "#555", marginTop: 8 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  accept: { flex: 1, backgroundColor: "#5b6cff", borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  acceptText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  dismiss: { flex: 1, backgroundColor: "#f0f0f3", borderRadius: 10, paddingVertical: 9, alignItems: "center" },
  dismissText: { color: "#333", fontWeight: "600", fontSize: 13 },
  msg: { color: "#888", fontSize: 13, marginTop: 16, textAlign: "center" },
});
```

- [ ] **Step 2: Manually verify**

As account B (who received A's rec), open the **Recs** tab (still labeled "Inbox" until Task 26). Expect the card with poster, "from @A", the note, and **Add to Want / Dismiss**. Tap **Add to Want** → the card disappears and the title appears under Want in B's Library. Send another, tap **Dismiss** → it disappears and does not enter the library.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/inbox.tsx"
git commit -m "feat: Recs tab for received recommendations"
```

---

## Group E — Feed & navigation

### Task 23: Feed merge/sort logic (TDD)

**Files:**
- Create: `src/lib/feedLogic.ts`
- Test: `__tests__/feedLogic.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { buildFeed } from "../src/lib/feedLogic";
import type { WatchlistEntry, Recommendation } from "../src/types/db";

const wl: WatchlistEntry[] = [
  { id: "w1", user_id: "a", tmdb_id: 1, media_type: "tv", title: "Severance", poster_path: null, status: "watched", added_at: "2026-06-01T10:00:00Z" },
  { id: "w2", user_id: "b", tmdb_id: 2, media_type: "movie", title: "Dune", poster_path: null, status: "watching", added_at: "2026-06-03T10:00:00Z" },
];
const recs: Recommendation[] = [
  { id: "r1", from_user: "c", to_user: "x", tmdb_id: 3, media_type: "movie", title: "Oppenheimer", poster_path: null, note: null, status: "pending", created_at: "2026-06-02T10:00:00Z" },
];

test("buildFeed merges watchlist + recs and sorts newest first", () => {
  const feed = buildFeed(wl, recs);
  expect(feed.map((f) => f.id)).toEqual(["w:w2", "r:r1", "w:w1"]);
  expect(feed[0].kind).toBe("watchlist");
  expect(feed[1].kind).toBe("recommendation");
});

test("feed items carry the acting user id and timestamp", () => {
  const feed = buildFeed(wl, recs);
  expect(feed[0].userId).toBe("b");
  expect(feed[0].at).toBe("2026-06-03T10:00:00Z");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest feedLogic`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

```ts
import type { WatchlistEntry, Recommendation } from "../types/db";

export type FeedItem =
  | { kind: "watchlist"; id: string; userId: string; at: string; entry: WatchlistEntry }
  | { kind: "recommendation"; id: string; userId: string; at: string; rec: Recommendation };

export function buildFeed(watchlist: WatchlistEntry[], recs: Recommendation[]): FeedItem[] {
  const items: FeedItem[] = [
    ...watchlist.map(
      (e): FeedItem => ({ kind: "watchlist", id: `w:${e.id}`, userId: e.user_id, at: e.added_at, entry: e })
    ),
    ...recs.map(
      (r): FeedItem => ({ kind: "recommendation", id: `r:${r.id}`, userId: r.from_user, at: r.created_at, rec: r })
    ),
  ];
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest feedLogic`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/feedLogic.ts __tests__/feedLogic.test.ts
git commit -m "feat: feed merge/sort logic"
```

---

### Task 24: Feed data layer

**Files:**
- Create: `src/services/feed.ts`

- [ ] **Step 1: Implement**

```ts
import { supabase } from "./supabase";
import type { WatchlistEntry, Recommendation, Friendship, Profile } from "../types/db";
import { deriveFriendIds } from "../lib/friendsLogic";
import { buildFeed, type FeedItem } from "../lib/feedLogic";

export type FeedRow = { item: FeedItem; username: string | null };

export async function getFeed(): Promise<FeedRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  const { data: frows, error: ferr } = await supabase.from("friendships").select("*");
  if (ferr) throw ferr;
  const friendIds = deriveFriendIds((frows as Friendship[]) ?? [], uid);
  if (friendIds.length === 0) return [];

  const { data: wl, error: wlErr } = await supabase
    .from("watchlist")
    .select("*")
    .in("user_id", friendIds)
    .order("added_at", { ascending: false })
    .limit(50);
  if (wlErr) throw wlErr;

  const { data: recs, error: recErr } = await supabase
    .from("recommendations")
    .select("*")
    .in("from_user", friendIds)
    .order("created_at", { ascending: false })
    .limit(50);
  if (recErr) throw recErr;

  const { data: profs, error: pErr } = await supabase.from("profiles").select("*").in("id", friendIds);
  if (pErr) throw pErr;
  const profiles = (profs as Profile[]) ?? [];

  const feed = buildFeed((wl as WatchlistEntry[]) ?? [], (recs as Recommendation[]) ?? []);
  return feed.map((item) => ({
    item,
    username: profiles.find((p) => p.id === item.userId)?.username ?? null,
  }));
}
```

- [ ] **Step 2: Type-check & commit**

Run: `npx tsc --noEmit` (expect no errors). Manual verification in Task 25.

```bash
git add src/services/feed.ts
git commit -m "feat: feed data layer (friend activity)"
```

---

### Task 25: Feed tab (friend activity)

**Files:**
- Modify: `app/(tabs)/for-you.tsx`

- [ ] **Step 1: Replace the placeholder**

```tsx
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { getFeed } from "../../src/services/feed";
import { PosterImage } from "../../src/components/PosterImage";

const WATCH_VERB: Record<string, string> = {
  watched: "finished watching",
  watching: "is watching",
  want: "wants to watch",
};

export default function FeedScreen() {
  const { data, isLoading } = useQuery({ queryKey: ["feed"], queryFn: getFeed });

  if (isLoading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={data ?? []}
      keyExtractor={(r) => r.item.id}
      ListEmptyComponent={
        <Text style={styles.msg}>
          No activity yet. Add friends and they’ll show up here as they watch and recommend.
        </Text>
      }
      renderItem={({ item: row }) => {
        const name = row.username ? `@${row.username}` : "A friend";
        if (row.item.kind === "watchlist") {
          const e = row.item.entry;
          return (
            <View style={styles.card}>
              <Text style={styles.head}>
                <Text style={styles.name}>{name}</Text> {WATCH_VERB[e.status]}
              </Text>
              <View style={styles.row}>
                <PosterImage path={e.poster_path} width={42} height={62} />
                <View style={styles.meta}>
                  <Text style={styles.title}>{e.title}</Text>
                  <Text style={styles.pill}>{e.media_type === "movie" ? "MOVIE" : "TV"}</Text>
                </View>
              </View>
            </View>
          );
        }
        const rec = row.item.rec;
        return (
          <View style={styles.card}>
            <Text style={styles.head}>
              <Text style={styles.name}>{name}</Text> recommends
            </Text>
            <View style={styles.row}>
              <PosterImage path={rec.poster_path} width={42} height={62} />
              <View style={styles.meta}>
                <Text style={styles.title}>{rec.title}</Text>
                {rec.note ? <Text style={styles.note}>“{rec.note}”</Text> : null}
                <Text style={styles.pill}>{rec.media_type === "movie" ? "MOVIE" : "TV"}</Text>
              </View>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 10, marginBottom: 10 },
  head: { fontSize: 12, marginBottom: 8 },
  name: { fontWeight: "700" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  meta: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "600" },
  note: { fontSize: 11, color: "#888", marginTop: 2 },
  pill: { alignSelf: "flex-start", marginTop: 4, fontSize: 9, color: "#5b6cff", backgroundColor: "#eef0ff", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, overflow: "hidden" },
  msg: { color: "#888", fontSize: 13, marginTop: 24, textAlign: "center" },
});
```

- [ ] **Step 2: Manually verify**

With accounts A and B as accepted friends: have B add a title (status Watching) and send A a recommendation. On A's **Feed** tab, expect "@B is watching <title>" and "@B recommends <title>" cards with posters, newest first. With no friends, expect the empty state.

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/for-you.tsx"
git commit -m "feat: Feed tab with friend activity"
```

---

### Task 26: Tab bar retitle + envelope (requests) entry with unread badge

**Files:**
- Create: `src/components/EnvelopeButton.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create the envelope button**

```tsx
import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { getIncomingRequests } from "../services/friends";

export function EnvelopeButton() {
  const router = useRouter();
  const { data } = useQuery({ queryKey: ["incoming-requests"], queryFn: getIncomingRequests });
  const count = data?.length ?? 0;
  return (
    <Pressable onPress={() => router.push("/requests")} style={styles.btn} hitSlop={8}>
      <Ionicons name="mail-outline" size={22} color="#111" />
      {count > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { marginRight: 16 },
  badge: { position: "absolute", top: -4, right: -6, backgroundColor: "#ff3b5b", borderRadius: 999, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "700" },
});
```

- [ ] **Step 2: Update the tab layout** (retitle to Feed · Library · Add · Recs · Profile; add the envelope to the Feed header)

```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EnvelopeButton } from "../../src/components/EnvelopeButton";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="for-you"
        options={{
          title: "Feed",
          headerRight: () => <EnvelopeButton />,
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="watchlist"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: "Add",
          tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: "Recs",
          tabBarIcon: ({ color, size }) => <Ionicons name="film" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Manually verify**

Tab bar now reads **Feed · Library · Add · Recs · Profile**. The Feed header shows an envelope; when account A has a pending incoming request, a red badge with the count appears. Tapping the envelope opens the Requests screen; accepting clears the badge (pull to refresh / re-focus the Feed).

- [ ] **Step 4: Commit**

```bash
git add src/components/EnvelopeButton.tsx "app/(tabs)/_layout.tsx"
git commit -m "feat: retitle tabs and add requests envelope with badge"
```

---

## Final verification

### Task 27: Full-suite test + end-to-end smoke

- [ ] **Step 1: Run the whole unit suite**

Run: `npx jest`
Expected: all suites pass (existing `friendCode`, `username`, `smoke` plus new `tmdbNormalize`, `tmdb`, `friendsLogic`, `recommendLogic`, `feedLogic`).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: End-to-end smoke (two accounts)**

With accounts A and B:
1. A searches TMDB (Add), adds titles across Want/Watching/Watched — posters render.
2. A adds B as a friend (username and friend-code paths). B accepts via the envelope/Requests.
3. A opens B's profile, sees B's library by status (including if B is private).
4. A recommends a title to B (title-first and friend-first). B sees it in Recs, Adds-to-Want (lands in B's Library) and Dismisses another.
5. Both see each other's activity on the Feed, newest first.
6. Set `EXPO_PUBLIC_TMDB_TOKEN` to empty → search shows "TMDB not configured", no crash. Restore it.

- [ ] **Step 4: Final review**

REQUIRED SUB-SKILL: dispatch a final code review over the whole branch (superpowers:requesting-code-review), then proceed to superpowers:finishing-a-development-branch.

---
