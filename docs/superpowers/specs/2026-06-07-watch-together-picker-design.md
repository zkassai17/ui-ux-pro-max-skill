# Watch-Together Picker — Design

**Status:** Approved (2026-06-07)

**Goal:** From the Home screen, a user picks 1–3 friends (a group of up to 4 including
themselves) and instantly sees what the whole group wants to watch — with one title
featured as "Tonight's pick," a list of shared want-to-watch titles, and a row of
TMDB-driven suggestions derived from everyone's watch history, optionally filtered by
genre.

This is the first of two standout features. The "Wrapped / stats card" is a separate
later design + plan cycle.

---

## User Flow

```
Home (for-you) card: "What should we watch?"
  → Group chooser: multi-select 1–3 friends (you + up to 3 = max 4)
    → Results screen for the group
```

## Results Screen (top to bottom)

1. **Genre chips** — Comedy, Action, Drama, Sci-Fi, Horror, Romance, Thriller, Animation,
   Documentary, Fantasy. Multi-select. Affects the **suggestions row only**.
2. **Tonight's pick** — hero card with a **Shuffle** button to reroll. Drawn from the
   shared want-list when one exists; otherwise drawn from the ranked suggestions.
3. **"You all want to watch"** — titles every participant has with status `want`
   (intersection across all 1–4 libraries), matched on `tmdb_id + media_type`. Sorted by
   most-recent mutual interest (the newest `added_at` among participants, descending).
4. **"Because you've all been watching"** — TMDB suggestions seeded from everyone's
   **watched history**, ranked, genre-filtered, excluding anything anyone already has.

Tapping any title (hero, shared, or suggestion) navigates to the existing
`/title/[mediaType]/[id]` detail screen.

## Empty / Edge States

- **No friends yet** (chooser): friendly empty state with a shortcut to the Add-friend
  screen.
- **No shared want-to-watch titles**: section 3 is hidden; the hero is drawn from
  suggestions; the suggestions row carries the experience.
- **No shared AND no suggestions** (e.g. brand-new accounts with empty histories): a
  gentle nudge to add more titles to want lists, with a shortcut to search.
- **Loading**: spinner while libraries + TMDB recommendations resolve.

---

## Architecture

No database changes. Everything runs off existing tables (`watchlist`, `profiles`,
`friendships`) and the existing friend-read RLS policy (`watchlist friend select` in
migration 0003), which already permits reading an accepted friend's full watchlist rows.

### Pure logic — `src/lib/watchTogetherLogic.ts` (unit tested)

- `sharedWantToWatch(libraries: WatchlistEntry[][]): WatchlistEntry[]`
  - Returns titles present with status `want` in **every** library, matched on
    `tmdb_id + media_type` (never by title string).
  - Excludes a title if **any** participant has it with status other than `want`
    (e.g. someone already `watched` it).
  - De-dupes by `tmdb_id + media_type`; returns one representative entry per title.
  - Sorts by the most-recent `added_at` across participants, descending.

- `rankSuggestions(candidatesByPerson, owned): SuggestedTitle[]`
  - `candidatesByPerson: SuggestedTitle[][]` — one TMDB-recommendation list per person.
  - `owned: { tmdbId: number; mediaType: MediaType }[]` — every title anyone already has
    in their library (any status). Excluded from results.
  - Scores each unique candidate (`tmdb_id + media_type`) by the number of distinct people
    whose list surfaced it; ties broken by TMDB `popularity` descending.
  - Returns the top 20.

- `filterByGenre(suggestions: SuggestedTitle[], genreIds: number[]): SuggestedTitle[]`
  - `genreIds` empty → returns the list unchanged. Otherwise keeps a suggestion only if
    its `genreIds` intersects the selected set. Pure and composable, so the screen can
    re-filter the already-ranked list when chips change without refetching or re-ranking.

- `pickHero(list: T[], index: number): T | null` — safe indexed pick used by Shuffle
  (`index` taken modulo `list.length`; returns `null` for an empty list).

### Genre constant — `src/lib/genres.ts`

`GENRES: { label: string; ids: number[] }[]` mapping each friendly label to its TMDB genre
id(s), covering both movie and TV variants where they differ
(e.g. `Action = [28, 10759]`, `Sci-Fi = [878, 10765]`, `Comedy = [35]`). The filter is a
client-side intersection against each candidate's `genre_ids` — no extra TMDB calls.

### Data service — `src/services/watchTogether.ts`

`getWatchTogether(friendIds: string[]): Promise<{ shared: WatchlistEntry[]; suggestions: SuggestedTitle[] }>`

1. Fetch each participant's library: `getLibrary()` for the current user and
   `getLibrary(friendId)` for each friend.
2. `shared = sharedWantToWatch([myLib, ...friendLibs])`.
3. For suggestions: from each participant's library take up to **6 most recently added
   `watched` titles** as seeds, call `getRecommendations(mediaType, tmdbId)` for each,
   collect into `candidatesByPerson`.
4. `owned` = all participants' library rows (any status).
5. Return `{ shared, suggestions: rankSuggestions(candidatesByPerson, owned) }` — the full
   unfiltered ranked list, each carrying `genreIds`.

Genre filtering is applied in the screen via `filterByGenre(suggestions, selectedGenreIds)`
over the already-returned list, so changing a chip never refetches from TMDB or re-ranks.

Bounded TMDB usage: at most 6 seeds × 4 people = 24 `getRecommendations` calls on first
open. react-query caches by group key. The per-person seed cap is a named constant
(`SEEDS_PER_PERSON = 6`) so it can be tuned.

### TMDB service addition — `src/services/tmdb.ts`

`getRecommendations(mediaType: MediaType, tmdbId: number): Promise<SuggestedTitle[]>`
calls TMDB `/{mediaType}/{tmdbId}/recommendations`, normalizing each result to:

```ts
type SuggestedTitle = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath: string | null;
  genreIds: number[];
  popularity: number;
};
```

### Screens / routes

- `app/watch-together/index.tsx` — group chooser. Lists `getFriends()`; multi-select up to
  3; a "See picks" button (disabled until ≥1 selected) pushes the results route with the
  selected ids comma-joined. "No friends yet" empty state → Add-friend.
- `app/watch-together/[group].tsx` — results. Parses the comma-joined `group` param into
  `friendIds`, runs `getWatchTogether` via react-query, renders genre chips + hero +
  shared list + suggestions. Local state: selected genre ids, hero shuffle index.
- `WatchTogetherCard` component added to `app/(tabs)/for-you.tsx` (Home) → routes to
  `app/watch-together`.

### Components reused

`TitleRow`, `PosterImage`. The hero "Tonight's pick" is a new, larger card local to the
results screen.

---

## Error Handling

- Library fetch failure → error message on the results screen with a retry.
- A failed individual `getRecommendations` call is swallowed (that seed contributes no
  candidates) so one bad title can't break the whole suggestions row.
- Empty participant histories simply yield no suggestions (handled by the empty state).

## Testing

`__tests__/watchTogetherLogic.test.ts`:

- `sharedWantToWatch`: 2-, 3-, and 4-way `want` intersection; excludes a title when any
  participant has it as `watched`; matches on id not title; de-dupes; sort order by newest
  `added_at`.
- `rankSuggestions`: excludes owned titles; scores by distinct-people count; tie-break by
  popularity; caps at 20.
- `filterByGenre`: empty ids returns list unchanged; otherwise keeps only candidates whose
  `genreIds` intersect the selected set.
- `pickHero`: indexed pick, modulo wrap, null on empty.

`__tests__/genres.test.ts` (small): every `GENRES` entry has a non-empty id list; labels
are unique.

Existing 55 tests remain green. `tsc --noEmit` clean.

---

## Out of Scope (explicitly)

- Real-time "session" syncing between devices (this is a local, on-demand computation).
- Persisting chosen picks or session history.
- The Wrapped / stats card (separate design + plan).
- Group sizes beyond 4.
