import {
  posterUrl,
  normalizeSearchItem,
  normalizeSearchResults,
  normalizeDetail,
  normalizeDiscoverResults,
  normalizeGenres,
  normalizeWatchProviders,
  normalizeSuggestions,
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
    original_language: "en",
  });
  expect(t).toEqual({
    tmdbId: 1,
    mediaType: "movie",
    title: "Dune: Part Two",
    year: "2024",
    posterPath: "/d.jpg",
    rating: 8.2,
    originalLanguage: "en",
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
    originalLanguage: null,
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
    originalLanguage: null,
    overview: "A physicist...",
    genres: ["Drama", "History"],
  });
});

test("normalizeDiscoverResults injects mediaType (discover omits media_type)", () => {
  const out = normalizeDiscoverResults(
    {
      results: [
        { id: 1, name: "Severance", first_air_date: "2022-02-18", poster_path: "/s.jpg", vote_average: 8.4 },
        { id: 2 }, // no name → dropped
      ],
    },
    "tv"
  );
  expect(out).toEqual([
    { tmdbId: 1, mediaType: "tv", title: "Severance", year: "2022", posterPath: "/s.jpg", rating: 8.4, originalLanguage: null },
  ]);
});

test("normalizeGenres maps id/name pairs and tolerates missing data", () => {
  expect(normalizeGenres({ genres: [{ id: 28, name: "Action" }, { id: 35, name: "Comedy" }] })).toEqual([
    { id: 28, name: "Action" },
    { id: 35, name: "Comedy" },
  ]);
  expect(normalizeGenres({})).toEqual([]);
});

test("normalizeWatchProviders groups flatrate/rent/buy for a region", () => {
  const out = normalizeWatchProviders(
    {
      results: {
        US: {
          link: "https://tmdb/watch",
          flatrate: [{ provider_id: 8, provider_name: "Netflix", logo_path: "/n.jpg" }],
          rent: [{ provider_id: 9, provider_name: "Prime Video", logo_path: null }],
        },
      },
    },
    "US"
  );
  expect(out).toEqual({
    link: "https://tmdb/watch",
    flatrate: [{ providerId: 8, name: "Netflix", logoPath: "/n.jpg" }],
    rent: [{ providerId: 9, name: "Prime Video", logoPath: null }],
    buy: [],
  });
});

test("normalizeWatchProviders returns empty groups when region absent", () => {
  expect(normalizeWatchProviders({ results: {} }, "US")).toEqual({
    link: null,
    flatrate: [],
    rent: [],
    buy: [],
  });
});

test("normalizeSuggestions keeps genre ids and injects mediaType", () => {
  const out = normalizeSuggestions(
    {
      results: [
        { id: 1, name: "Severance", first_air_date: "2022-02-18", poster_path: "/s.jpg", vote_average: 8.4, genre_ids: [18, 9648] },
        { id: 2 }, // no name → dropped
      ],
    },
    "tv"
  );
  expect(out).toEqual([
    { tmdbId: 1, mediaType: "tv", title: "Severance", year: "2022", posterPath: "/s.jpg", rating: 8.4, originalLanguage: null, genreIds: [18, 9648] },
  ]);
});

test("normalizeSuggestions defaults missing genre_ids to an empty array", () => {
  const out = normalizeSuggestions(
    { results: [{ media_type: "movie", id: 5, title: "A", release_date: "2020-01-01", vote_average: 5 }] },
    "movie"
  );
  expect(out[0].genreIds).toEqual([]);
});
