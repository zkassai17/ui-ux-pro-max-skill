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
