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
