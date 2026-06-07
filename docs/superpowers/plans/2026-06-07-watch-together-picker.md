# Watch-Together Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user pick 1–3 friends from the Home screen and instantly see what the group wants to watch — a shuffleable "Tonight's pick," the shared want-to-watch list, and genre-filterable TMDB suggestions drawn from everyone's watch history.

**Architecture:** Pure, unit-tested logic (`src/lib/watchTogetherLogic.ts`, `src/lib/genres.ts`) computes intersections, ranking, and filtering. A thin data service (`src/services/watchTogether.ts`) fetches each participant's library (already permitted by the existing friend-read RLS policy) plus TMDB recommendations, then delegates to the pure logic. Two file-routes (`app/watch-together/index.tsx` chooser, `app/watch-together/[group].tsx` results) and a Home card render it. No database changes.

**Tech Stack:** Expo SDK 54, expo-router v6, React Native 0.81, @tanstack/react-query v5, TMDB v4, jest-expo. TypeScript throughout.

**Working directory for ALL commands:** `/Users/zacharykassai/ui-ux-pro-max-skill/watchnext`
Always prefix commands with `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext &&`. Run tsc/jest via the local binaries (`./node_modules/.bin/tsc`, `./node_modules/.bin/jest`) — never `npx tsc`. Commit + push to the `fork` remote on branch `feat/social-watch-recommendation-app`.

**Baseline:** 55 tests passing, `tsc --noEmit` clean.

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `src/types/tmdb.ts` | Add `Suggestion` type (`Title` + `genreIds`) | Modify |
| `src/lib/tmdbNormalize.ts` | Add `normalizeSuggestions` (preserves `genre_ids`) | Modify |
| `src/services/tmdb.ts` | Add `getGroupRecommendations` | Modify |
| `src/lib/genres.ts` | `GENRES` constant (label → TMDB genre ids) | Create |
| `src/lib/watchTogetherLogic.ts` | `sharedWantToWatch`, `rankSuggestions`, `filterByGenre`, `pickHero` | Create |
| `src/services/watchTogether.ts` | `getWatchTogether(friendIds)` orchestration | Create |
| `app/watch-together/index.tsx` | Group chooser (multi-select up to 3 friends) | Create |
| `app/watch-together/[group].tsx` | Results screen | Create |
| `app/(tabs)/for-you.tsx` | Add Home "What should we watch?" card | Modify |
| `__tests__/tmdbNormalize.test.ts` | Test `normalizeSuggestions` | Modify |
| `__tests__/genres.test.ts` | Test `GENRES` invariants | Create |
| `__tests__/watchTogetherLogic.test.ts` | Test all pure logic | Create |

Why an isolated `Suggestion` type instead of extending `Title`: the existing `normalizeSearchItem`/`normalizeDiscoverResults` tests assert exact object shape with `toEqual`, and `Title` is consumed across search/trending/discover/for-you. A separate type + normalizer keeps `genre_ids` available for filtering without disturbing those consumers.

---

### Task 1: `Suggestion` type, normalizer, and TMDB service fn

**Files:**
- Modify: `src/types/tmdb.ts`
- Modify: `src/lib/tmdbNormalize.ts`
- Modify: `src/services/tmdb.ts`
- Test: `__tests__/tmdbNormalize.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/tmdbNormalize.test.ts`. First add `normalizeSuggestions` to the existing import block at the top of the file (it currently imports `posterUrl, normalizeSearchItem, normalizeSearchResults, normalizeDetail, normalizeDiscoverResults, normalizeGenres, normalizeWatchProviders`). Then append:

```ts
test("normalizeSuggestions keeps genre ids and injects mediaType", () => {
  const out = normalizeSuggestions(
    {
      results: [
        { id: 1, name: "Severance", first_air_date: "2022-02-18", poster_path: "/s.jpg", vote_average: 8.4, genre_ids: [18, 9648] },
        { id: 2 }, // no name → dropped
      ],
    },
    "tv"
  );
  expect(out).toEqual([
    { tmdbId: 1, mediaType: "tv", title: "Severance", year: "2022", posterPath: "/s.jpg", rating: 8.4, genreIds: [18, 9648] },
  ]);
});

test("normalizeSuggestions defaults missing genre_ids to an empty array", () => {
  const out = normalizeSuggestions(
    { results: [{ media_type: "movie", id: 5, title: "A", release_date: "2020-01-01", vote_average: 5 }] },
    "movie"
  );
  expect(out[0].genreIds).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/jest tmdbNormalize -t "normalizeSuggestions"`
Expected: FAIL — `normalizeSuggestions is not a function` (or import error).

- [ ] **Step 3: Add the `Suggestion` type**

In `src/types/tmdb.ts`, after the `Title` type (which ends before `TitleDetail`), add:

```ts
export type Suggestion = Title & { genreIds: number[] };
```

- [ ] **Step 4: Implement the normalizer**

In `src/lib/tmdbNormalize.ts`, update the import on line 1 to include `Suggestion`:

```ts
import type { MediaType, Title, Suggestion, TitleDetail, Genre, WatchProvider, WatchProviders } from "../types/tmdb";
```

Then add this function right after `normalizeDiscoverResults`:

```ts
export function normalizeSuggestions(raw: any, mediaType: MediaType): Suggestion[] {
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return results
    .map((item: any) => {
      const base = normalizeSearchItem({ ...item, media_type: mediaType });
      if (!base) return null;
      const genreIds = Array.isArray(item.genre_ids)
        ? item.genre_ids.filter((g: any) => typeof g === "number")
        : [];
      return { ...base, genreIds };
    })
    .filter((s: Suggestion | null): s is Suggestion => s !== null);
}
```

- [ ] **Step 5: Add the TMDB service function**

In `src/services/tmdb.ts`, add `normalizeSuggestions` to the import from `../lib/tmdbNormalize` (which currently imports `normalizeSearchResults, normalizeDetail, normalizeDiscoverResults, normalizeGenres, normalizeWatchProviders`), and add `Suggestion` to the type import from `../types/tmdb`. Then append at the end of the file:

```ts
export async function getGroupRecommendations(mediaType: MediaType, id: number): Promise<Suggestion[]> {
  const raw = await tmdbGet(`/${mediaType}/${id}/recommendations`);
  return normalizeSuggestions(raw, mediaType);
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/jest tmdbNormalize && ./node_modules/.bin/tsc --noEmit`
Expected: PASS, tsc clean.

- [ ] **Step 7: Commit**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git add watchnext/src/types/tmdb.ts watchnext/src/lib/tmdbNormalize.ts watchnext/src/services/tmdb.ts watchnext/__tests__/tmdbNormalize.test.ts && git commit -m "feat: Suggestion type + recommendations normalizer preserving genre ids"
```

---

### Task 2: `GENRES` constant

**Files:**
- Create: `src/lib/genres.ts`
- Test: `__tests__/genres.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/genres.test.ts`:

```ts
import { GENRES } from "../src/lib/genres";

test("every genre has a label and at least one tmdb id", () => {
  for (const g of GENRES) {
    expect(g.label.length).toBeGreaterThan(0);
    expect(g.ids.length).toBeGreaterThan(0);
    expect(g.ids.every((id) => typeof id === "number")).toBe(true);
  }
});

test("genre labels are unique", () => {
  const labels = GENRES.map((g) => g.label);
  expect(new Set(labels).size).toBe(labels.length);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/jest genres`
Expected: FAIL — cannot find module `../src/lib/genres`.

- [ ] **Step 3: Implement the constant**

Create `src/lib/genres.ts`. Ids cover both movie and TV variants where TMDB splits them (e.g. Action = movie 28 + TV 10759):

```ts
// Friendly genre labels mapped to their TMDB genre ids. Some genres have
// distinct movie vs TV ids, so each label carries a set; a title matches the
// label if any of its genre_ids is in the set.
export type GenreOption = { label: string; ids: number[] };

export const GENRES: GenreOption[] = [
  { label: "Comedy", ids: [35] },
  { label: "Action", ids: [28, 10759] },
  { label: "Drama", ids: [18] },
  { label: "Sci-Fi", ids: [878, 10765] },
  { label: "Horror", ids: [27] },
  { label: "Romance", ids: [10749] },
  { label: "Thriller", ids: [53] },
  { label: "Animation", ids: [16] },
  { label: "Documentary", ids: [99] },
  { label: "Fantasy", ids: [14, 10765] },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/jest genres`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git add watchnext/src/lib/genres.ts watchnext/__tests__/genres.test.ts && git commit -m "feat: GENRES constant mapping labels to TMDB genre ids"
```

---

### Task 3: `sharedWantToWatch` pure logic

**Files:**
- Create: `src/lib/watchTogetherLogic.ts`
- Test: `__tests__/watchTogetherLogic.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/watchTogetherLogic.test.ts`:

```ts
import { sharedWantToWatch } from "../src/lib/watchTogetherLogic";
import type { WatchlistEntry } from "../src/types/db";

function wl(over: Partial<WatchlistEntry>): WatchlistEntry {
  return {
    id: "id-" + Math.random(),
    user_id: "u",
    tmdb_id: 1,
    media_type: "movie",
    title: "X",
    poster_path: null,
    status: "want",
    rating: null,
    added_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

test("returns titles every participant wants, matched on id+media_type", () => {
  const mine = [wl({ tmdb_id: 1, status: "want" }), wl({ tmdb_id: 2, status: "want" })];
  const theirs = [wl({ tmdb_id: 1, status: "want" }), wl({ tmdb_id: 3, status: "want" })];
  const out = sharedWantToWatch([mine, theirs]);
  expect(out.map((e) => e.tmdb_id)).toEqual([1]);
});

test("excludes a title if any participant has it as not-want", () => {
  const mine = [wl({ tmdb_id: 1, status: "want" })];
  const theirs = [wl({ tmdb_id: 1, status: "watched" })];
  expect(sharedWantToWatch([mine, theirs])).toEqual([]);
});

test("matches on media_type, not just id", () => {
  const mine = [wl({ tmdb_id: 1, media_type: "movie", status: "want" })];
  const theirs = [wl({ tmdb_id: 1, media_type: "tv", status: "want" })];
  expect(sharedWantToWatch([mine, theirs])).toEqual([]);
});

test("works for 4 participants (intersection across all)", () => {
  const a = [wl({ tmdb_id: 1 }), wl({ tmdb_id: 2 })];
  const b = [wl({ tmdb_id: 1 }), wl({ tmdb_id: 2 })];
  const c = [wl({ tmdb_id: 1 }), wl({ tmdb_id: 2 })];
  const d = [wl({ tmdb_id: 1 })]; // d only wants 1
  const out = sharedWantToWatch([a, b, c, d]);
  expect(out.map((e) => e.tmdb_id)).toEqual([1]);
});

test("sorts by most-recent added_at across participants, descending", () => {
  const mine = [
    wl({ tmdb_id: 1, added_at: "2026-01-01T00:00:00Z" }),
    wl({ tmdb_id: 2, added_at: "2026-05-01T00:00:00Z" }),
  ];
  const theirs = [
    wl({ tmdb_id: 1, added_at: "2026-06-01T00:00:00Z" }), // pushes title 1 to newest
    wl({ tmdb_id: 2, added_at: "2026-02-01T00:00:00Z" }),
  ];
  const out = sharedWantToWatch([mine, theirs]);
  expect(out.map((e) => e.tmdb_id)).toEqual([1, 2]);
});

test("empty input returns empty", () => {
  expect(sharedWantToWatch([])).toEqual([]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/jest watchTogetherLogic`
Expected: FAIL — cannot find module `../src/lib/watchTogetherLogic`.

- [ ] **Step 3: Implement `sharedWantToWatch`**

Create `src/lib/watchTogetherLogic.ts`:

```ts
import type { WatchlistEntry } from "../types/db";

// Titles every participant has with status "want", matched on tmdb_id+media_type.
// A title is dropped if any participant has it with a different status. Sorted by
// the newest added_at across participants (freshest mutual interest first).
export function sharedWantToWatch(libraries: WatchlistEntry[][]): WatchlistEntry[] {
  if (libraries.length === 0) return [];
  const maps = libraries.map((lib) => {
    const m = new Map<string, WatchlistEntry>();
    for (const e of lib) m.set(`${e.media_type}:${e.tmdb_id}`, e);
    return m;
  });
  const [first, ...rest] = maps;
  const picked: { entry: WatchlistEntry; maxAdded: string }[] = [];
  for (const [key, entry] of Array.from(first.entries())) {
    if (entry.status !== "want") continue;
    let ok = true;
    let maxAdded = entry.added_at;
    for (const m of rest) {
      const e = m.get(key);
      if (!e || e.status !== "want") {
        ok = false;
        break;
      }
      if (e.added_at > maxAdded) maxAdded = e.added_at;
    }
    if (ok) picked.push({ entry, maxAdded });
  }
  return picked.sort((a, b) => b.maxAdded.localeCompare(a.maxAdded)).map((p) => p.entry);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/jest watchTogetherLogic && ./node_modules/.bin/tsc --noEmit`
Expected: PASS (6 tests), tsc clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git add watchnext/src/lib/watchTogetherLogic.ts watchnext/__tests__/watchTogetherLogic.test.ts && git commit -m "feat: sharedWantToWatch N-way want-list intersection"
```

---

### Task 4: `rankSuggestions`, `filterByGenre`, `pickHero` pure logic

**Files:**
- Modify: `src/lib/watchTogetherLogic.ts`
- Test: `__tests__/watchTogetherLogic.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `__tests__/watchTogetherLogic.test.ts`. First extend the import line to:

```ts
import { sharedWantToWatch, rankSuggestions, filterByGenre, pickHero } from "../src/lib/watchTogetherLogic";
```

Add a `Suggestion` import and factory plus the tests:

```ts
import type { Suggestion } from "../src/types/tmdb";

function sg(over: Partial<Suggestion>): Suggestion {
  return { tmdbId: 1, mediaType: "movie", title: "X", year: null, posterPath: null, rating: null, genreIds: [], ...over };
}

test("rankSuggestions scores by number of distinct people surfacing a title", () => {
  const a = sg({ tmdbId: 1, title: "A" });
  const b = sg({ tmdbId: 2, title: "B" });
  // person1 -> [a, b], person2 -> [b]; b surfaced by 2 people, a by 1
  const out = rankSuggestions([[a, b], [b]], new Set());
  expect(out.map((x) => x.tmdbId)).toEqual([2, 1]);
});

test("rankSuggestions excludes owned titles", () => {
  const a = sg({ tmdbId: 1 });
  const b = sg({ tmdbId: 2 });
  const out = rankSuggestions([[a, b]], new Set(["movie:1"]));
  expect(out.map((x) => x.tmdbId)).toEqual([2]);
});

test("rankSuggestions counts a person once even if a title repeats in their list", () => {
  const a = sg({ tmdbId: 1 });
  const out = rankSuggestions([[a, a]], new Set());
  expect(out).toHaveLength(1);
});

test("rankSuggestions ties break by rating desc then title", () => {
  const z = sg({ tmdbId: 1, title: "Zebra", rating: 8 });
  const ap = sg({ tmdbId: 2, title: "Apple", rating: 9 });
  const mg = sg({ tmdbId: 3, title: "Mango", rating: 9 });
  const out = rankSuggestions([[z, ap, mg]], new Set());
  expect(out.map((x) => x.tmdbId)).toEqual([2, 3, 1]);
});

test("rankSuggestions caps at 20", () => {
  const lists = [Array.from({ length: 30 }, (_, i) => sg({ tmdbId: i + 1, title: "T" + i }))];
  expect(rankSuggestions(lists, new Set())).toHaveLength(20);
});

test("filterByGenre with empty ids returns the list unchanged", () => {
  const list = [sg({ tmdbId: 1, genreIds: [35] })];
  expect(filterByGenre(list, [])).toBe(list);
});

test("filterByGenre keeps only candidates intersecting the selected ids", () => {
  const comedy = sg({ tmdbId: 1, genreIds: [35] });
  const action = sg({ tmdbId: 2, genreIds: [28] });
  const out = filterByGenre([comedy, action], [35]);
  expect(out.map((x) => x.tmdbId)).toEqual([1]);
});

test("pickHero indexes with wraparound and returns null on empty", () => {
  expect(pickHero(["a", "b", "c"], 0)).toBe("a");
  expect(pickHero(["a", "b", "c"], 4)).toBe("b"); // 4 % 3 = 1
  expect(pickHero([], 0)).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/jest watchTogetherLogic`
Expected: FAIL — `rankSuggestions`/`filterByGenre`/`pickHero` not exported.

- [ ] **Step 3: Implement the three functions**

Append to `src/lib/watchTogetherLogic.ts`. Add the import for `Suggestion` and reuse `titleKey` from `forYouLogic`:

```ts
import type { Suggestion } from "../types/tmdb";
import { titleKey } from "./forYouLogic";

// Aggregates per-person TMDB recommendation lists into one ranked list. A
// candidate's score is the number of distinct people whose list surfaced it
// (each person votes at most once per title). Titles in excludeKeys (anything
// any participant already has) are removed. Ties break by rating then title.
// Returns the top 20.
export function rankSuggestions(
  candidatesByPerson: Suggestion[][],
  excludeKeys: Set<string>
): Suggestion[] {
  const byKey = new Map<string, { item: Suggestion; score: number }>();
  for (const list of candidatesByPerson) {
    const seenThisPerson = new Set<string>();
    for (const cand of list) {
      const key = titleKey(cand);
      if (excludeKeys.has(key)) continue;
      if (seenThisPerson.has(key)) continue;
      seenThisPerson.add(key);
      const existing = byKey.get(key);
      if (existing) existing.score += 1;
      else byKey.set(key, { item: cand, score: 1 });
    }
  }
  return [...byKey.values()]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ra = a.item.rating ?? -1;
      const rb = b.item.rating ?? -1;
      if (rb !== ra) return rb - ra;
      return a.item.title.localeCompare(b.item.title);
    })
    .map((e) => e.item)
    .slice(0, 20);
}

// Keeps suggestions whose genreIds intersect the selected set. Empty selection
// is a no-op (returns the same reference, so callers can cheaply skip work).
export function filterByGenre(suggestions: Suggestion[], genreIds: number[]): Suggestion[] {
  if (genreIds.length === 0) return suggestions;
  const set = new Set(genreIds);
  return suggestions.filter((s) => s.genreIds.some((g) => set.has(g)));
}

// Safe indexed pick used by the Shuffle button; wraps the index and returns null
// for an empty list.
export function pickHero<T>(list: T[], index: number): T | null {
  if (list.length === 0) return null;
  const i = ((index % list.length) + list.length) % list.length;
  return list[i];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/jest watchTogetherLogic && ./node_modules/.bin/tsc --noEmit`
Expected: PASS (14 tests in this file), tsc clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git add watchnext/src/lib/watchTogetherLogic.ts watchnext/__tests__/watchTogetherLogic.test.ts && git commit -m "feat: rankSuggestions, filterByGenre, pickHero"
```

---

### Task 5: `getWatchTogether` data service

**Files:**
- Create: `src/services/watchTogether.ts`

No unit test — this function performs IO (Supabase + TMDB), matching the repo convention that services are thin and untested while logic is tested. Verification is via `tsc`.

- [ ] **Step 1: Implement the service**

Create `src/services/watchTogether.ts`:

```ts
import { getLibrary } from "./watchlist";
import { getGroupRecommendations } from "./tmdb";
import { sharedWantToWatch, rankSuggestions } from "../lib/watchTogetherLogic";
import { titleKey } from "../lib/forYouLogic";
import type { WatchlistEntry } from "../types/db";
import type { Suggestion } from "../types/tmdb";

// How many recent watched titles per person seed the TMDB suggestion engine.
// Caps total TMDB calls at SEEDS_PER_PERSON * (group size, max 4).
const SEEDS_PER_PERSON = 6;

export type WatchTogetherResult = {
  shared: WatchlistEntry[];
  suggestions: Suggestion[];
};

export async function getWatchTogether(friendIds: string[]): Promise<WatchTogetherResult> {
  const libraries = await Promise.all([getLibrary(), ...friendIds.map((id) => getLibrary(id))]);

  const shared = sharedWantToWatch(libraries);

  const excludeKeys = new Set(
    libraries.flat().map((e) => titleKey({ mediaType: e.media_type, tmdbId: e.tmdb_id }))
  );

  // getLibrary returns rows ordered by added_at desc, so the first watched
  // entries are the most recent.
  const candidatesByPerson = await Promise.all(
    libraries.map(async (lib) => {
      const seeds = lib.filter((e) => e.status === "watched").slice(0, SEEDS_PER_PERSON);
      const lists = await Promise.all(
        seeds.map((s) => getGroupRecommendations(s.media_type, s.tmdb_id).catch(() => [] as Suggestion[]))
      );
      return lists.flat();
    })
  );

  const suggestions = rankSuggestions(candidatesByPerson, excludeKeys);
  return { shared, suggestions };
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/tsc --noEmit`
Expected: clean (no output).

- [ ] **Step 3: Commit**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git add watchnext/src/services/watchTogether.ts && git commit -m "feat: getWatchTogether orchestration service"
```

---

### Task 6: Group chooser screen

**Files:**
- Create: `app/watch-together/index.tsx`

No unit test (UI screen). Verification via `tsc`.

- [ ] **Step 1: Implement the chooser**

Create `app/watch-together/index.tsx`:

```tsx
import { useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter, Stack } from "expo-router";
import { getFriends } from "../../src/services/friends";
import type { Profile } from "../../src/types/db";

const MAX_FRIENDS = 3;

export default function GroupChooserScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["friends"], queryFn: getFriends });
  const [selected, setSelected] = useState<string[]>([]);
  const friends = data ?? [];

  function toggle(id: string) {
    setSelected((cur) =>
      cur.includes(id)
        ? cur.filter((x) => x !== id)
        : cur.length >= MAX_FRIENDS
        ? cur
        : [...cur, id]
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: true, title: "Watch together" }} />
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : friends.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            Add a friend first — then you can find something to watch together.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.push("/friends/add")}>
            <Text style={styles.primaryBtnText}>Add a friend</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Text style={styles.help}>
            Pick up to {MAX_FRIENDS} friends · {selected.length} selected
          </Text>
          <FlatList
            data={friends}
            keyExtractor={(f) => f.id}
            contentContainerStyle={{ paddingBottom: 12 }}
            renderItem={({ item }: { item: Profile }) => {
              const on = selected.includes(item.id);
              return (
                <Pressable style={[styles.row, on && styles.rowOn]} onPress={() => toggle(item.id)}>
                  <Text style={styles.username}>@{item.username}</Text>
                  <Text style={[styles.check, on && styles.checkOn]}>{on ? "✓" : "+"}</Text>
                </Pressable>
              );
            }}
          />
          <Pressable
            style={[styles.primaryBtn, selected.length === 0 && styles.btnDisabled]}
            disabled={selected.length === 0}
            onPress={() => router.push(`/watch-together/${selected.join(",")}`)}
          >
            <Text style={styles.primaryBtnText}>See picks</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  help: { fontSize: 12, color: "#888", fontWeight: "600", marginBottom: 12 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#eee",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  rowOn: { borderColor: "#5b6cff", backgroundColor: "#eef0ff" },
  username: { fontSize: 15, fontWeight: "600" },
  check: { fontSize: 18, color: "#bbb", fontWeight: "700", lineHeight: 22 },
  checkOn: { color: "#5b6cff" },
  primaryBtn: { backgroundColor: "#5b6cff", borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnDisabled: { backgroundColor: "#c7ccff" },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  empty: { marginTop: 40, alignItems: "center", gap: 16 },
  emptyText: { color: "#888", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
```

- [ ] **Step 2: Verify it typechecks**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git add watchnext/app/watch-together/index.tsx && git commit -m "feat: watch-together group chooser screen"
```

---

### Task 7: Results screen

**Files:**
- Create: `app/watch-together/[group].tsx`

No unit test (UI screen). Verification via `tsc` plus a manual smoke note at the end.

- [ ] **Step 1: Implement the results screen**

Create `app/watch-together/[group].tsx`:

```tsx
import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { getWatchTogether } from "../../src/services/watchTogether";
import { filterByGenre, pickHero } from "../../src/lib/watchTogetherLogic";
import { GENRES } from "../../src/lib/genres";
import { PosterImage } from "../../src/components/PosterImage";
import { TitleRow } from "../../src/components/TitleRow";
import type { MediaType } from "../../src/types/tmdb";

type HeroItem = { tmdbId: number; mediaType: MediaType; title: string; posterPath: string | null };

export default function WatchTogetherResultsScreen() {
  const { group } = useLocalSearchParams<{ group: string }>();
  const friendIds = (group ?? "").split(",").filter(Boolean);
  const router = useRouter();
  const [genreIds, setGenreIds] = useState<number[]>([]);
  const [shuffle, setShuffle] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["watch-together", friendIds.join(",")],
    queryFn: () => getWatchTogether(friendIds),
  });

  function toggleGenre(ids: number[]) {
    // a chip toggles its whole id-set; treat the first id as the chip identity
    const head = ids[0];
    setGenreIds((cur) => (cur.includes(head) ? cur.filter((x) => !ids.includes(x)) : [...cur, ...ids]));
    setShuffle(0);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Stack.Screen options={{ headerShown: true, title: "What to watch" }} />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : isError || !data ? (
        <Text style={styles.msg}>Couldn't load picks. Go back and try again.</Text>
      ) : (
        (() => {
          const shared = data.shared;
          const suggestions = filterByGenre(data.suggestions, genreIds);

          const sharedHero: HeroItem[] = shared.map((e) => ({
            tmdbId: e.tmdb_id,
            mediaType: e.media_type,
            title: e.title,
            posterPath: e.poster_path,
          }));
          const suggHero: HeroItem[] = suggestions.map((s) => ({
            tmdbId: s.tmdbId,
            mediaType: s.mediaType,
            title: s.title,
            posterPath: s.posterPath,
          }));
          const heroPool = sharedHero.length > 0 ? sharedHero : suggHero;
          const hero = pickHero(heroPool, shuffle);

          const open = (mt: MediaType, id: number) => router.push(`/title/${mt}/${id}`);

          return (
            <>
              {/* Genre chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipScroll}
                contentContainerStyle={styles.chipRow}
              >
                {GENRES.map((g) => {
                  const on = g.ids.some((id) => genreIds.includes(id));
                  return (
                    <Pressable
                      key={g.label}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => toggleGenre(g.ids)}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{g.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Hero */}
              {hero ? (
                <View style={styles.heroCard}>
                  <Text style={styles.heroLabel}>TONIGHT'S PICK</Text>
                  <Pressable style={styles.heroBody} onPress={() => open(hero.mediaType, hero.tmdbId)}>
                    <PosterImage path={hero.posterPath} width={92} height={138} radius={10} />
                    <View style={styles.heroMeta}>
                      <Text style={styles.heroTitle}>{hero.title}</Text>
                      <Text style={styles.heroType}>{hero.mediaType === "movie" ? "Movie" : "TV"}</Text>
                    </View>
                  </Pressable>
                  {heroPool.length > 1 ? (
                    <Pressable style={styles.shuffleBtn} onPress={() => setShuffle((n) => n + 1)}>
                      <Text style={styles.shuffleText}>⇄ Shuffle</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}

              {/* Shared want-to-watch */}
              {shared.length > 0 ? (
                <>
                  <Text style={styles.section}>You all want to watch</Text>
                  {shared.map((e) => (
                    <TitleRow
                      key={`${e.media_type}:${e.tmdb_id}`}
                      title={e.title}
                      mediaType={e.media_type}
                      posterPath={e.poster_path}
                      onPress={() => open(e.media_type, e.tmdb_id)}
                    />
                  ))}
                </>
              ) : null}

              {/* Suggestions from history */}
              <Text style={styles.section}>Because you've all been watching</Text>
              {suggestions.length === 0 ? (
                <Text style={styles.msg}>
                  {shared.length === 0
                    ? "No shared picks yet — add more titles to your want lists to get matches."
                    : "No suggestions match that genre. Try clearing a filter."}
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggRow}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={`${s.mediaType}:${s.tmdbId}`}
                      style={styles.sugg}
                      onPress={() => open(s.mediaType, s.tmdbId)}
                    >
                      <PosterImage path={s.posterPath} width={104} height={156} radius={10} />
                      <Text style={styles.suggTitle} numberOfLines={2}>
                        {s.title}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </>
          );
        })()
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chipScroll: { flexGrow: 0, marginBottom: 16 },
  chipRow: { gap: 8, paddingRight: 8, alignItems: "center" },
  chip: { backgroundColor: "#f0f0f3", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  chipOn: { backgroundColor: "#5b6cff" },
  chipText: { fontSize: 13, lineHeight: 18, color: "#666", fontWeight: "600" },
  chipTextOn: { color: "#fff" },

  heroCard: { borderWidth: 1.5, borderColor: "#eef0ff", backgroundColor: "#f7f8ff", borderRadius: 16, padding: 14, marginBottom: 8 },
  heroLabel: { fontSize: 10, fontWeight: "800", color: "#5b6cff", letterSpacing: 1, marginBottom: 10 },
  heroBody: { flexDirection: "row", gap: 14, alignItems: "center" },
  heroMeta: { flex: 1, minWidth: 0 },
  heroTitle: { fontSize: 18, fontWeight: "700" },
  heroType: { fontSize: 12, color: "#888", marginTop: 4 },
  shuffleBtn: { alignSelf: "flex-start", marginTop: 12, backgroundColor: "#5b6cff", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  shuffleText: { color: "#fff", fontWeight: "700", fontSize: 13, lineHeight: 17 },

  section: { fontSize: 13, fontWeight: "700", color: "#888", marginTop: 22, marginBottom: 10 },
  suggRow: { gap: 12, paddingBottom: 8, paddingRight: 8 },
  sugg: { width: 104 },
  suggTitle: { fontSize: 11, fontWeight: "600", marginTop: 6 },
  msg: { color: "#888", fontSize: 13, marginTop: 8, lineHeight: 19 },
});
```

- [ ] **Step 2: Verify it typechecks**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git add watchnext/app/watch-together/\[group\].tsx && git commit -m "feat: watch-together results screen (hero, shared list, suggestions, genre filter)"
```

---

### Task 8: Home "What should we watch?" card

**Files:**
- Modify: `app/(tabs)/for-you.tsx`

No unit test (UI). Verification via `tsc`.

- [ ] **Step 1: Add the card component**

In `app/(tabs)/for-you.tsx`, add a `WatchTogetherCard` component above the `ForYouRail` component definition (after the `MAX_SUGGESTIONS` constant). `useRouter` is already imported:

```tsx
function WatchTogetherCard() {
  const router = useRouter();
  return (
    <Pressable style={styles.wtCard} onPress={() => router.push("/watch-together")}>
      <Text style={styles.wtTitle}>What should we watch?</Text>
      <Text style={styles.wtSub}>Find something you and your friends both want to see →</Text>
    </Pressable>
  );
}
```

- [ ] **Step 2: Render it in the header**

In `HomeScreen`, update the `ListHeaderComponent` to render the card first:

```tsx
      ListHeaderComponent={
        <View>
          <WatchTogetherCard />
          <ForYouRail mediaType="movie" heading="Movies for you" />
          <ForYouRail mediaType="tv" heading="Shows for you" />
          <Text style={styles.sectionHeading}>Activity</Text>
        </View>
      }
```

- [ ] **Step 3: Add the card styles**

Add to the `StyleSheet.create({...})` block in `app/(tabs)/for-you.tsx`:

```tsx
  wtCard: { backgroundColor: "#5b6cff", borderRadius: 16, padding: 16, marginBottom: 18 },
  wtTitle: { color: "#fff", fontSize: 17, fontWeight: "800" },
  wtSub: { color: "#dfe3ff", fontSize: 12, marginTop: 6, lineHeight: 17 },
```

- [ ] **Step 4: Verify it typechecks**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git add watchnext/app/\(tabs\)/for-you.tsx && git commit -m "feat: Home card entry point for watch-together picker"
```

---

### Task 9: Full-suite verification + push

**Files:** none (verification only)

- [ ] **Step 1: Run the whole suite + typecheck**

Run: `cd /Users/zacharykassai/ui-ux-pro-max-skill/watchnext && ./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/jest 2>&1 | tail -8`
Expected: tsc clean; all tests pass. New count = 55 baseline + 2 (normalizeSuggestions) + 2 (genres) + 14 (watchTogetherLogic) = **73 tests**.

- [ ] **Step 2: Manual smoke (if a device/simulator is available)**

Launch the app, go to Home → tap "What should we watch?" → select 1–3 friends → "See picks". Verify: hero renders, Shuffle rerolls, "You all want to watch" lists overlaps, suggestions row appears, tapping a genre chip filters suggestions, tapping any title opens its detail screen. If no simulator is available, state that explicitly rather than claiming success.

- [ ] **Step 3: Push to the fork**

```bash
cd /Users/zacharykassai/ui-ux-pro-max-skill && git push fork HEAD
```

---

## Self-Review

**Spec coverage:**
- Home card entry point → Task 8. ✓
- Group chooser, up to 4 (1 self + 3 friends, `MAX_FRIENDS = 3`) → Task 6. ✓
- Genre chips, suggestions-only filter → Task 7 (`filterByGenre` over suggestions, never over `shared`). ✓
- Tonight's pick hero + Shuffle (drawn from shared, else suggestions) → Task 7 (`heroPool`, `pickHero`, `shuffle`). ✓
- "You all want to watch" N-way intersection → Task 3 (`sharedWantToWatch`). ✓
- "Because you've all been watching" history suggestions → Tasks 1, 4, 5 (`normalizeSuggestions` → `getGroupRecommendations` → `getWatchTogether` → `rankSuggestions`). ✓
- No-overlap handling → Task 7 (hero falls back to suggestions; empty-state copy). ✓ Note: the spec's "fallback = friend's loved titles" is naturally subsumed — when there are no shared picks, the history-based suggestions row carries the experience, which is broader than just one friend's loved list. This is an intentional simplification; no separate fallback function is needed.
- No DB changes → confirmed; no migration task. ✓
- Tests for all pure logic → Tasks 1–4. ✓

**Placeholder scan:** No TBD/TODO/"handle edge cases"; every code step shows complete code. ✓

**Type consistency:**
- `Suggestion = Title & { genreIds: number[] }` defined in Task 1, used consistently in Tasks 4, 5, 7. ✓
- `sharedWantToWatch(WatchlistEntry[][]) → WatchlistEntry[]`, `rankSuggestions(Suggestion[][], Set<string>) → Suggestion[]`, `filterByGenre(Suggestion[], number[]) → Suggestion[]`, `pickHero<T>(T[], number) → T | null` — signatures match across definition and call sites. ✓
- `getWatchTogether(string[]) → { shared: WatchlistEntry[]; suggestions: Suggestion[] }` — consumed correctly in Task 7. ✓
- `titleKey({ mediaType, tmdbId })` reused from `forYouLogic`; `WatchlistEntry` uses `media_type`/`tmdb_id`, mapped explicitly at every call. ✓
- Route `/watch-together` (chooser) and `/watch-together/<ids>` ([group]) match between Tasks 6, 7, 8. ✓

---

## Out of Scope
- Real-time cross-device session sync.
- Persisting chosen picks.
- The Wrapped / stats card (separate plan).
