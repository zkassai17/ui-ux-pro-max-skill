# Social Watch Recommendation App — Design Spec

**Date:** 2026-06-05
**Status:** Approved (design phase)

## Overview

A cross-platform mobile app that helps a user decide what TV show or movie to watch next, based on their own watch history and preferred genres, and lets them suggest titles to friends who also use the app. Friends are real users with their own accounts and watch histories. Recommendations combine a real movie/TV catalog (TMDB) with AI-generated personalized reasoning (Claude).

## Goals

- Recommend titles to a user based on their watch history + genres.
- Let users rate what they've watched and note what they liked.
- Let users suggest titles to friends, with an AI-tailored pitch, and see friends' reactions.
- Proactively surface "you should recommend X to friend Y" prompts.
- Keep a watchlist that tracks who recommended each title and is filterable by streaming platform and genre.

## Non-Goals (v1)

- Importing watch history from streaming services (not technically feasible; excluded).
- Per-item privacy controls (replaced by a single global "private account" toggle).
- App Store / Play Store publishing is a later, separate phase — v1 runs via Expo Go for development and testing.

## Platform & Stack

- **App:** Expo (React Native) — single codebase for iOS and Android.
- **Backend:** Supabase — Postgres database, authentication (email/password + Google/Apple), file storage, realtime updates, Row-Level Security.
- **Catalog data:** TMDB API — titles, posters, genres, cast, type (movie/show), streaming-provider availability.
- **AI:** Claude, called only via a Supabase Edge Function (API key stays server-side).
- **Push notifications:** Expo push service.
- **Front-end design:** Use the design toolkit skills (ui-ux-pro-max / design) for a polished, modern UI.

## App Structure

**One-time onboarding:**
1. Sign up (email/password, or Google/Apple one-tap).
2. Pick a username; a unique friend code is generated.
3. Tap-to-seed: a grid of popular titles, tap everything already watched to seed taste.
4. Add friends (friend code/username search, contacts, or invite link).

**Main app — 5 bottom tabs:**
- **For You** — personalized picks (history + genre + AI). Each card shows a "why you'll like it" and has a ✓ (accept → adds to Watchlist) and ✗ (dismiss → never suggested again; also teaches the engine). Also surfaces proactive "recommend X to [friend]" nudges.
- **Watchlist** — saved titles. Shows who recommended each (friend / AI / self). Filterable by streaming platform and genre. Checking one off moves it into watched history.
- **Add** — search any title, mark watched, rate 5 stars, add an optional note on what was liked.
- **Inbox** — suggestions friends sent you, with their note + AI pitch. React: Interested (→ adds to Watchlist, tagged with recommender) / Watched it / Not for me. Sender sees the reaction.
- **Profile** — watch history & ratings, friends list, private-account toggle, notification settings, friend code & invite link, edit username/avatar, sign out.

## Data Model

- **User** — username, friend code, email, auth info, private-account toggle, notification prefs, avatar.
- **Friendship** — links two users, with status (pending/accepted) for friend requests.
- **Title** — globally cached from TMDB: TMDB id, name, poster, genres, type, streaming providers. Shared across all users to keep the app fast and reduce TMDB calls.
- **WatchedItem** — a user watched a Title: 5-star rating, optional "what I liked" note, date.
- **WatchlistItem** — a Title a user wants to watch, the recommender source (friend / AI / self), and platform/genre tags for filtering.
- **Suggestion** — sender, recipient, Title, sender's note, AI pitch, recipient reaction (interested / watched / not for me).
- **Notification** — record of pushes (friend suggested, invite joined, proactive nudge, new picks).

Design choices:
- Titles are cached globally so all users benefit and TMDB usage stays low.
- WatchlistItem recommender source points to a friend, the AI, or self.
- Friendships and Suggestions are separate relational tables to keep visibility and matching queries clean.

## Recommendation Engine

**Personal "For You" picks:**
1. Analyze the user's watch history — highly-rated titles, favored genres/themes/cast — and exclude already-seen titles.
2. Pull candidate titles from TMDB (similar titles, same-genre highly-rated, trending in the user's taste lanes). Guarantees every suggestion is a real title with poster, info, and streaming availability.
3. Send candidates + a taste summary to Claude, which ranks them and writes the short "why you'll like this."

**Proactive "recommend X to friend Y":**
- Cross-references the current user's history against a friend's tastes; finds something the user would vouch for that fits the friend; drafts a pitch the user can edit before sending.

**AI execution & cost control:**
- All Claude calls run through a Supabase Edge Function; the API key is never in the client.
- AI reasoning runs in small batches and caches results; "For You" refreshes periodically or when history changes meaningfully, not on every open.
- The ✓/✗ triage on recommendations feeds back into the taste signal over time.

## Friends & Suggestions Flow

**Adding friends:** username + friend code as the foundation; also add from contacts (those already on the app) and share invite links. Adding sends a friend request the other person accepts (consensual, since history is visible to friends).

**Sending a suggestion:** from any title, "Suggest to a friend" → pick one or more friends, optional note; the app attaches a friend-tailored AI pitch. Lands in the recipient's Inbox in real time.

**Receiving a suggestion:** in the Inbox, react Interested (→ Watchlist, tagged "recommended by [friend]") / Watched it / Not for me. Sender sees the reaction.

## Privacy

- Watch history and ratings are visible to accepted friends by default.
- A single global "private account" toggle hides a user's full history from friends.

## Notifications

Push for: a friend suggests you a title; someone you invited joins; a proactive "recommend X to [friend]" nudge; occasional "new picks for you." All toggleable in settings. Sent via Expo push.

## Security

- Supabase Row-Level Security: users read only their own data and accepted, non-private friends' data.
- Claude API key lives only in the Edge Function, never in the client.
- Auth handled by Supabase (email/password + Google/Apple).

## Build & Delivery

- Develop and test with Expo Go on a physical phone (QR code) — no app store needed during the build.
- App Store / Play Store publishing is a final, separate phase (Apple $99/yr, Google $25 one-time, plus review).

## Open Questions

None outstanding — design approved by user on 2026-06-05.
