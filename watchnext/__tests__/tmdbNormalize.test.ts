import {
  posterUrl,
  normalizeSearchItem,
  normalizeSearchResults,
  normalizeDetail,
} from "../src/lib/tmdbNormalize";

test("posterUrl builds a CDN url and handles null", () => {
  expect(posterUrl("/abc.jpg")).toBe("https://image.tmdb.org/t/p/w500/abc.jpg");
  expect(posterUrl("/abc.jpg", "w342")).toBe("https://image.tmdb.org/t/p/w342/abc.jpg");
  expect(posterUrl(null)).toBeNull();
});

test("normalizeSearchItem maps a movie and rounds rating", () => {
  const t = normalizeSearchItem({
    media_type: "movie",
    id: 1,
    title: "Dune: Part Two",
    release_date: "2024-03-01",
    poster_path: "/d.jpg",
    vote_average: 8.234,
  });
  expect(t).toEqual({
    tmdbId: 1,
    mediaType: "movie",
    title: "Dune: Part Two",
    year: "2024",
    posterPath: "/d.jpg",
    rating: 8.2,
  });
});

test("normalizeSearchItem maps a tv show using name/first_air_date", () => {
  const t = normalizeSearchItem({
    media_type: "tv",
    id: 2,
    name: "Severance",
    first_air_date: "2022-02-18",
    poster_path: null,
    vote_average: 0,
  });
  expect(t).toEqual({
    tmdbId: 2,
    mediaType: "tv",
    title: "Severance",
    year: "2022",
    posterPath: null,
    rating: null,
  });
});

test("normalizeSearchItem drops people and unknown media types", () => {
  expect(normalizeSearchItem({ media_type: "person", id: 3, name: "Someone" })).toBeNull();
});

test("normalizeSearchResults filters non-movie/tv and missing titles", () => {
  const out = normalizeSearchResults({
    results: [
      { media_type: "movie", id: 1, title: "A", release_date: "2020-01-01", vote_average: 5 },
      { media_type: "person", id: 2, name: "P" },
      { media_type: "tv", id: 3 }, // no name → dropped
    ],
  });
  expect(out.map((t) => t.tmdbId)).toEqual([1]);
});

test("normalizeDetail includes overview and genre names", () => {
  const d = normalizeDetail(
    {
      id: 9,
      title: "Oppenheimer",
      release_date: "2023-07-21",
      poster_path: "/o.jpg",
      vote_average: 8.1,
      overview: "A physicist...",
      genres: [{ id: 1, name: "Drama" }, { id: 2, name: "History" }],
    },
    "movie"
  );
  expect(d).toEqual({
    tmdbId: 9,
    mediaType: "movie",
    title: "Oppenheimer",
    year: "2023",
    posterPath: "/o.jpg",
    rating: 8.1,
    overview: "A physicist...",
    genres: ["Drama", "History"],
  });
});
