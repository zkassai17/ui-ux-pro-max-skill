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
  const [initialized, setInitialized] = useState(false);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("Failed to load profile", error.message);
      return;
    }
    setProfile((data as Profile) ?? null);
  }

  useEffect(() => {
    // The callback MUST stay synchronous and never await another Supabase call:
    // it runs while the GoTrue auth lock is held, and loadProfile() needs that
    // same lock — awaiting it here deadlocks getSession(), so loading never
    // resolves. Profile loading is driven by the session effect below instead.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => setInitialized(true));

    return () => sub.subscription.unsubscribe();
  }, []);

  // Gate `loading` on the profile fetch too: index routing distinguishes
  // "logged in, needs onboarding" (no profile) from "logged in, has profile",
  // so loading must stay true until the profile is actually resolved — not
  // merely until getSession() returns — or we race a redirect to onboarding.
  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    // Whenever the session changes (incl. a fresh sign-in), go back to loading
    // until the NEW profile is resolved — otherwise index routing sees the old
    // (null) profile and wrongly redirects a returning user to onboarding.
    setLoading(true);
    (async () => {
      if (session) await loadProfile(session.user.id);
      else setProfile(null);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialized, session]);

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
