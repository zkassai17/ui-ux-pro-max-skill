// Curated top US streaming providers with their TMDB watch-provider IDs.
// Used for the Add-screen provider filter (discover's with_watch_providers).
export const WATCH_REGION = "US";

export type ProviderOption = { id: number; name: string };

export const TOP_PROVIDERS: ProviderOption[] = [
  { id: 8, name: "Netflix" },
  { id: 9, name: "Prime Video" },
  { id: 337, name: "Disney+" },
  { id: 15, name: "Hulu" },
  { id: 1899, name: "Max" },
  { id: 350, name: "Apple TV+" },
  { id: 531, name: "Paramount+" },
  { id: 386, name: "Peacock" },
];
