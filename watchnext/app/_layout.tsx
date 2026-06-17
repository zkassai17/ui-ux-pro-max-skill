import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../src/auth/AuthProvider";
import { I18nProvider } from "../src/i18n/I18nProvider";

// Mobile networks drop requests transiently (a momentary dead zone surfaces as
// "TypeError: Network request failed"). Retry a few times with backoff so a brief
// blip self-heals instead of surfacing an error the user has to manually retry.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
