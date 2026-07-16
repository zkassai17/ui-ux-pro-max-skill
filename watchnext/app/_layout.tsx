import "../src/lib/globalFont"; // makes Oxanium the default font for all text
import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Poppins_600SemiBold, Poppins_700Bold } from "@expo-google-fonts/poppins";
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import { AuthProvider, useAuth } from "../src/auth/AuthProvider";
import { I18nProvider } from "../src/i18n/I18nProvider";
import { ProProvider } from "../src/pro/ProProvider";
import { HEADING } from "../src/theme";

// Global auth guard: the moment there's no session (e.g. after Sign out from
// anywhere in the app), route to the sign-in screen. Index only routes on entry,
// so without this, signing out leaves you on an empty logged-in screen.
function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!session && !inAuth) router.replace("/(auth)/sign-in");
  }, [session, loading, segments, router]);
  return null;
}

// Mobile networks drop requests transiently (a momentary dead zone surfaces as
// "TypeError: Network request failed"). Retry a few times with backoff so a brief
// blip self-heals instead of surfacing an error the user has to manually retry.
//
// staleTime/gcTime: without these every screen refetched on entry (staleTime
// defaults to 0), so revisiting a tab showed a spinner even when we already had
// the data. Now cached data renders instantly and only refetches in the
// background when it's actually stale; mutations still call invalidateQueries,
// which forces a refetch regardless of staleTime, so nothing goes out of date.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      staleTime: 60 * 1000, // 1 min: revisits within a minute skip the refetch entirely
      gcTime: 30 * 60 * 1000, // keep cache 30 min so returning to a screen is instant
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!fontsLoaded) return null; // brief; cached after first load

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ProProvider>
            <AuthGate />
            {/* headerBackButtonDisplayMode "minimal" = chevron only, so the back
                button never leaks the internal "(tabs)" route-group name.
                Editorial serif for every pushed-screen header title. */}
            <Stack
              screenOptions={{
                headerShown: false,
                headerBackButtonDisplayMode: "minimal",
                headerTitleStyle: { fontFamily: HEADING },
              }}
            />
          </ProProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
