export type MediaType = "movie" | "tv";

export type Title = {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  rating: number | null;
};

export type Suggestion = Title & { genreIds: number[] };

export type TitleDetail = Title & {
  overview: string;
  genres: string[];
};

export type Genre = { id: number; name: string };

export type WatchProvider = {
  providerId: number;
  name: string;
  logoPath: string | null;
};

export type WatchProviders = {
  link: string | null;
  flatrate: WatchProvider[];
  rent: WatchProvider[];
  buy: WatchProvider[];
};
