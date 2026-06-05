# Phase 1: Foundation & Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Expo app skeleton with Supabase auth, profile creation (username + friend code), and a 5-tab navigation shell — a runnable app a user can sign up to and land in.

**Architecture:** Expo (React Native) + TypeScript + expo-router for navigation. Supabase provides Postgres, auth, and Row-Level Security. Pure logic (friend-code generation, username validation, taste/profile helpers) lives in framework-free modules under `src/lib/` and is unit-tested with Jest. UI screens are thin wrappers over a typed Supabase data layer in `src/services/`.

**Tech Stack:** Expo SDK 51+, TypeScript, expo-router, @supabase/supabase-js, @tanstack/react-query, Jest + jest-expo + @testing-library/react-native.

---

## Scope of This Phase

In scope: project scaffolding, test harness, Supabase `profiles` schema + RLS, friend-code + username utilities (TDD), Supabase client, sign-up / sign-in screens, automatic profile creation, auth-aware routing, and an empty 5-tab shell (For You / Watchlist / Add / Inbox / Profile).

Out of scope (later phases): TMDB catalog, watch history & ratings, recommendation engine, friends/suggestions, notifications.

## File Structure

```
watchnext/
├── app/                              # expo-router routes
│   ├── _layout.tsx                   # root layout: providers + auth gate
│   ├── index.tsx                     # redirect based on auth/onboarding state
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── onboarding/
│   │   └── username.tsx              # pick username (friend code auto-generated)
│   └── (tabs)/
│       ├── _layout.tsx               # bottom tab navigator (5 tabs)
│       ├── for-you.tsx               # placeholder
│       ├── watchlist.tsx             # placeholder
│       ├── add.tsx                   # placeholder
│       ├── inbox.tsx                 # placeholder
│       └── profile.tsx               # shows username + friend code + sign out
├── src/
│   ├── lib/
│   │   ├── friendCode.ts             # pure: generate/validate friend codes
│   │   └── username.ts               # pure: validate/normalize usernames
│   ├── services/
│   │   └── supabase.ts               # configured Supabase client
│   ├── auth/
│   │   └── AuthProvider.tsx          # session context + helpers
│   └── types/
│       └── db.ts                     # Profile type
├── supabase/
│   └── migrations/
│       └── 0001_profiles.sql         # profiles table + RLS + trigger
├── __tests__/                        # mirrors src/lib
│   ├── friendCode.test.ts
│   └── username.test.ts
├── app.json
├── package.json
├── tsconfig.json
├── jest.config.js
├── jest.setup.ts
└── .env.example
```

---

## Task 1: Scaffold the Expo app

**Files:**
- Create: `watchnext/` (via create-expo-app)
- Modify: `watchnext/package.json`, `watchnext/app.json`

- [ ] **Step 1: Create the Expo project (TypeScript + expo-router)**

Run from repo root:
```bash
npx create-expo-app@latest watchnext --template expo-template-blank-typescript
cd watchnext
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
```

- [ ] **Step 2: Enable expo-router as the entry point**

Edit `watchnext/package.json` — set the `main` field:
```json
{
  "main": "expo-router/entry"
}
```

Edit `watchnext/app.json` — add the scheme and router plugin inside `expo`:
```json
{
  "expo": {
    "scheme": "watchnext",
    "plugins": ["expo-router"]
  }
}
```

- [ ] **Step 3: Replace the default screen with a temporary router index**

Delete `watchnext/App.tsx` if present. Create `watchnext/app/_layout.tsx`:
```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Create `watchnext/app/index.tsx`:
```tsx
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>watchnext booting…</Text>
    </View>
  );
}
```

- [ ] **Step 4: Verify the app boots**

Run: `npx expo start` and open in Expo Go (scan QR) or press `i`/`a`.
Expected: a screen showing "watchnext booting…". Stop the server (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add watchnext
git commit -m "feat(app): scaffold expo + expo-router skeleton"
```

---

## Task 2: Set up the test harness

**Files:**
- Create: `watchnext/jest.config.js`, `watchnext/jest.setup.ts`
- Modify: `watchnext/package.json`

- [ ] **Step 1: Install test dependencies**

```bash
cd watchnext
npx expo install jest jest-expo @testing-library/react-native @types/jest
```

- [ ] **Step 2: Configure Jest**

Create `watchnext/jest.config.js`:
```js
module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@supabase/.*))",
  ],
};
```

Create `watchnext/jest.setup.ts`:
```ts
import "@testing-library/react-native";
```

- [ ] **Step 3: Add the test script**

Edit `watchnext/package.json` scripts:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch"
  }
}
```

- [ ] **Step 4: Add a smoke test and run it**

Create `watchnext/__tests__/smoke.test.ts`:
```ts
test("jest runs", () => {
  expect(1 + 1).toBe(2);
});
```

Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add watchnext/jest.config.js watchnext/jest.setup.ts watchnext/package.json watchnext/package-lock.json watchnext/__tests__/smoke.test.ts
git commit -m "test(app): add jest + react-native testing-library harness"
```

---

## Task 3: Friend-code utility (TDD)

A friend code is an 8-character uppercase code from an unambiguous alphabet (no 0/O/1/I) so it's easy to read and share.

**Files:**
- Create: `watchnext/src/lib/friendCode.ts`
- Test: `watchnext/__tests__/friendCode.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `watchnext/__tests__/friendCode.test.ts`:
```ts
import { generateFriendCode, isValidFriendCode, FRIEND_CODE_ALPHABET } from "../src/lib/friendCode";

test("generates an 8-char code from the safe alphabet", () => {
  const code = generateFriendCode();
  expect(code).toHaveLength(8);
  for (const ch of code) {
    expect(FRIEND_CODE_ALPHABET).toContain(ch);
  }
});

test("alphabet excludes ambiguous characters", () => {
  for (const ch of "01OI") {
    expect(FRIEND_CODE_ALPHABET).not.toContain(ch);
  }
});

test("validates well-formed codes and rejects bad ones", () => {
  expect(isValidFriendCode(generateFriendCode())).toBe(true);
  expect(isValidFriendCode("short")).toBe(false);
  expect(isValidFriendCode("abcdefgh")).toBe(false); // lowercase
  expect(isValidFriendCode("ABCDE0OI")).toBe(false); // ambiguous chars
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- friendCode`
Expected: FAIL — cannot find module `../src/lib/friendCode`.

- [ ] **Step 3: Implement the utility**

Create `watchnext/src/lib/friendCode.ts`:
```ts
export const FRIEND_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateFriendCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length);
    code += FRIEND_CODE_ALPHABET[idx];
  }
  return code;
}

export function isValidFriendCode(value: string): boolean {
  if (value.length !== CODE_LENGTH) return false;
  for (const ch of value) {
    if (!FRIEND_CODE_ALPHABET.includes(ch)) return false;
  }
  return true;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- friendCode`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add watchnext/src/lib/friendCode.ts watchnext/__tests__/friendCode.test.ts
git commit -m "feat(lib): friend code generation and validation"
```

---

## Task 4: Username utility (TDD)

Usernames: 3–20 chars, lowercase letters/numbers/underscore, must start with a letter. `normalizeUsername` lowercases and trims.

**Files:**
- Create: `watchnext/src/lib/username.ts`
- Test: `watchnext/__tests__/username.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `watchnext/__tests__/username.test.ts`:
```ts
import { normalizeUsername, isValidUsername } from "../src/lib/username";

test("normalizes to lowercase and trims", () => {
  expect(normalizeUsername("  Zach_17 ")).toBe("zach_17");
});

test("accepts valid usernames", () => {
  expect(isValidUsername("zach_17")).toBe(true);
  expect(isValidUsername("abc")).toBe(true);
});

test("rejects invalid usernames", () => {
  expect(isValidUsername("ab")).toBe(false);          // too short
  expect(isValidUsername("1abc")).toBe(false);        // starts with number
  expect(isValidUsername("has space")).toBe(false);   // space
  expect(isValidUsername("a".repeat(21))).toBe(false); // too long
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- username`
Expected: FAIL — cannot find module `../src/lib/username`.

- [ ] **Step 3: Implement the utility**

Create `watchnext/src/lib/username.ts`:
```ts
const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidUsername(value: string): boolean {
  return USERNAME_RE.test(normalizeUsername(value));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- username`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add watchnext/src/lib/username.ts watchnext/__tests__/username.test.ts
git commit -m "feat(lib): username normalization and validation"
```

---

## Task 5: Supabase project + profiles schema

This task uses the Supabase MCP tools (or the Supabase dashboard) to create a project and apply the migration. Record the project URL and anon (publishable) key for Task 6.

**Files:**
- Create: `watchnext/supabase/migrations/0001_profiles.sql`
- Create: `watchnext/.env.example`

- [ ] **Step 1: Create a Supabase project**

Use the Supabase MCP `create_project` tool (confirm cost first), or create one at https://supabase.com/dashboard. Note the project ref, project URL (`https://<ref>.supabase.co`), and the publishable/anon key.

- [ ] **Step 2: Write the migration**

Create `watchnext/supabase/migrations/0001_profiles.sql`:
```sql
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
```

- [ ] **Step 3: Apply the migration**

Use the Supabase MCP `apply_migration` tool with name `0001_profiles` and the SQL above, or run it in the dashboard SQL editor.

- [ ] **Step 4: Verify the table exists**

Use the Supabase MCP `list_tables` tool (or dashboard Table editor).
Expected: a `profiles` table with RLS enabled and the three policies.

- [ ] **Step 5: Record env template and commit**

Create `watchnext/.env.example`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-publishable-anon-key
```

Create a real `watchnext/.env` (NOT committed — it's gitignored by the Expo template) with the actual values.

```bash
git add watchnext/supabase/migrations/0001_profiles.sql watchnext/.env.example
git commit -m "feat(db): profiles table with RLS"
```

---

## Task 6: Supabase client + Profile type

**Files:**
- Create: `watchnext/src/types/db.ts`
- Create: `watchnext/src/services/supabase.ts`

- [ ] **Step 1: Install the client and storage adapter**

```bash
cd watchnext
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
```

- [ ] **Step 2: Define the Profile type**

Create `watchnext/src/types/db.ts`:
```ts
export type Profile = {
  id: string;
  username: string;
  friend_code: string;
  avatar_url: string | null;
  is_private: boolean;
  created_at: string;
};
```

- [ ] **Step 3: Create the configured client**

Create `watchnext/src/services/supabase.ts`:
```ts
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY");
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 4: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add watchnext/src/types/db.ts watchnext/src/services/supabase.ts watchnext/package.json watchnext/package-lock.json
git commit -m "feat(app): configured supabase client and Profile type"
```

---

## Task 7: Auth provider (session context)

**Files:**
- Create: `watchnext/src/auth/AuthProvider.tsx`

- [ ] **Step 1: Implement the provider**

Create `watchnext/src/auth/AuthProvider.tsx`:
```tsx
import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import type { Profile } from "../types/db";

type AuthState = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s);
      if (s) await loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id);
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

- [ ] **Step 2: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add watchnext/src/auth/AuthProvider.tsx
git commit -m "feat(auth): session + profile context provider"
```

---

## Task 8: Root layout + auth-aware routing

**Files:**
- Modify: `watchnext/app/_layout.tsx`
- Modify: `watchnext/app/index.tsx`

- [ ] **Step 1: Wrap the app in providers**

Replace `watchnext/app/_layout.tsx`:
```tsx
import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/auth/AuthProvider";

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

Install react-query:
```bash
cd watchnext && npx expo install @tanstack/react-query
```

- [ ] **Step 2: Route based on auth + onboarding state**

Replace `watchnext/app/index.tsx`:
```tsx
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/auth/AuthProvider";

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (!profile) return <Redirect href="/onboarding/username" />;
  return <Redirect href="/(tabs)/for-you" />;
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit`
Expected: no errors (route targets exist after Tasks 9–11; if running now, create empty placeholder files first or proceed in order).

- [ ] **Step 4: Commit**

```bash
git add watchnext/app/_layout.tsx watchnext/app/index.tsx watchnext/package.json watchnext/package-lock.json
git commit -m "feat(app): providers and auth-aware routing"
```

---

## Task 9: Sign-up and sign-in screens

**Files:**
- Create: `watchnext/app/(auth)/sign-up.tsx`
- Create: `watchnext/app/(auth)/sign-in.tsx`

- [ ] **Step 1: Sign-up screen (email + password)**

Create `watchnext/app/(auth)/sign-up.tsx`:
```tsx
import { useState } from "react";
import { Link, router } from "expo-router";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/services/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignUp() {
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) return Alert.alert("Sign up failed", error.message);
    router.replace("/onboarding/username");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>Create account</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }} />
      <TextInput placeholder="Password" secureTextEntry
        value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }} />
      <Button title={busy ? "…" : "Sign up"} onPress={handleSignUp} disabled={busy} />
      <Link href="/(auth)/sign-in">Already have an account? Sign in</Link>
    </View>
  );
}
```

- [ ] **Step 2: Sign-in screen**

Create `watchnext/app/(auth)/sign-in.tsx`:
```tsx
import { useState } from "react";
import { Link, router } from "expo-router";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/services/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSignIn() {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return Alert.alert("Sign in failed", error.message);
    router.replace("/");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>Welcome back</Text>
      <TextInput placeholder="Email" autoCapitalize="none" keyboardType="email-address"
        value={email} onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }} />
      <TextInput placeholder="Password" secureTextEntry
        value={password} onChangeText={setPassword}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }} />
      <Button title={busy ? "…" : "Sign in"} onPress={handleSignIn} disabled={busy} />
      <Link href="/(auth)/sign-up">Need an account? Sign up</Link>
    </View>
  );
}
```

- [ ] **Step 3: Manual verification**

Run: `npx expo start`, open the app, create an account.
Expected: after sign-up you are routed toward onboarding (the username screen lands in Task 10). Note: enable "Confirm email = off" in Supabase Auth settings during development so sign-up sessions are immediate.

- [ ] **Step 4: Commit**

```bash
git add "watchnext/app/(auth)"
git commit -m "feat(auth): email/password sign-up and sign-in screens"
```

---

## Task 10: Onboarding — choose username, create profile

**Files:**
- Create: `watchnext/app/onboarding/username.tsx`

- [ ] **Step 1: Implement the username screen**

Create `watchnext/app/onboarding/username.tsx`:
```tsx
import { useState } from "react";
import { router } from "expo-router";
import { Alert, Button, Text, TextInput, View } from "react-native";
import { supabase } from "../../src/services/supabase";
import { useAuth } from "../../src/auth/AuthProvider";
import { isValidUsername, normalizeUsername } from "../../src/lib/username";
import { generateFriendCode } from "../../src/lib/friendCode";

export default function ChooseUsername() {
  const { session, refreshProfile } = useAuth();
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    const username = normalizeUsername(value);
    if (!isValidUsername(username)) {
      return Alert.alert("Invalid username", "3–20 chars, start with a letter, letters/numbers/underscore only.");
    }
    if (!session) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").insert({
      id: session.user.id,
      username,
      friend_code: generateFriendCode(),
    });
    setBusy(false);
    if (error) {
      const msg = error.code === "23505" ? "That username is taken." : error.message;
      return Alert.alert("Could not save", msg);
    }
    await refreshProfile();
    router.replace("/(tabs)/for-you");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>Pick a username</Text>
      <Text style={{ color: "#666" }}>Friends use this to find you.</Text>
      <TextInput placeholder="username" autoCapitalize="none"
        value={value} onChangeText={setValue}
        style={{ borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12 }} />
      <Button title={busy ? "…" : "Continue"} onPress={handleSave} disabled={busy} />
    </View>
  );
}
```

- [ ] **Step 2: Manual verification**

Run the app, sign up, choose a username.
Expected: profile row created (verify with Supabase MCP `list_tables`/SQL `select * from profiles`), then routed to the For You tab (Task 11). Re-using a taken username shows "That username is taken."

- [ ] **Step 3: Commit**

```bash
git add watchnext/app/onboarding
git commit -m "feat(onboarding): username selection creates profile with friend code"
```

---

## Task 11: Tab shell (5 tabs)

**Files:**
- Create: `watchnext/app/(tabs)/_layout.tsx`
- Create: `watchnext/app/(tabs)/for-you.tsx`, `watchlist.tsx`, `add.tsx`, `inbox.tsx`, `profile.tsx`

- [ ] **Step 1: Install icons**

```bash
cd watchnext && npx expo install @expo/vector-icons
```

- [ ] **Step 2: Tab navigator**

Create `watchnext/app/(tabs)/_layout.tsx`:
```tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen name="for-you" options={{ title: "For You",
        tabBarIcon: ({ color, size }) => <Ionicons name="star" color={color} size={size} /> }} />
      <Tabs.Screen name="watchlist" options={{ title: "Watchlist",
        tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" color={color} size={size} /> }} />
      <Tabs.Screen name="add" options={{ title: "Add",
        tabBarIcon: ({ color, size }) => <Ionicons name="add-circle" color={color} size={size} /> }} />
      <Tabs.Screen name="inbox" options={{ title: "Inbox",
        tabBarIcon: ({ color, size }) => <Ionicons name="mail" color={color} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile",
        tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} /> }} />
    </Tabs>
  );
}
```

- [ ] **Step 3: Placeholder tab screens**

Create each of `for-you.tsx`, `watchlist.tsx`, `add.tsx`, `inbox.tsx` in `watchnext/app/(tabs)/` with this shape (swap the label per file):
```tsx
import { Text, View } from "react-native";
export default function Screen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>For You — coming in a later phase</Text>
    </View>
  );
}
```

- [ ] **Step 4: Profile tab shows real data + sign out**

Create `watchnext/app/(tabs)/profile.tsx`:
```tsx
import { Button, Text, View } from "react-native";
import { useAuth } from "../../src/auth/AuthProvider";

export default function Profile() {
  const { profile, signOut } = useAuth();
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>@{profile?.username}</Text>
      <Text style={{ color: "#666" }}>Friend code: {profile?.friend_code}</Text>
      <Text style={{ color: "#666" }}>Private account: {profile?.is_private ? "On" : "Off"}</Text>
      <Button title="Sign out" onPress={signOut} />
    </View>
  );
}
```

- [ ] **Step 5: Full flow verification**

Run the app. Sign up → pick username → land on For You. Tap through all 5 tabs. Open Profile: see your `@username` and friend code. Tap Sign out → returns to sign-in. Sign back in → lands on For You (no re-onboarding).

- [ ] **Step 6: Commit**

```bash
git add "watchnext/app/(tabs)" watchnext/package.json watchnext/package-lock.json
git commit -m "feat(app): 5-tab shell with working profile and sign out"
```

---

## Phase 1 Done — Definition of Done

- App boots in Expo Go.
- A new user can sign up, choose a username, and gets a profile row with a unique friend code.
- Returning users sign in and skip onboarding.
- All 5 tabs render; Profile shows username + friend code and can sign out.
- `npm test` passes (friendCode, username, smoke).
- `npx tsc --noEmit` is clean.

## Next Phases (separate plans)

- **Phase 2:** TMDB integration + Add/search + watch history & 5★ ratings with notes.
- **Phase 3:** Recommendation engine (TMDB candidates + Claude reasoning via Edge Function) + For You ✓/✗ triage + Watchlist with platform/genre filters.
- **Phase 4:** Friends (username/code, contacts, invite links, requests) + suggestions inbox + reactions + proactive nudges.
- **Phase 5:** Push notifications + settings + Google/Apple sign-in + private-account toggle polish.
- **Phase 6:** App Store / Play Store release.
