import { searchTitles, getTitleDetails } from "../src/services/tmdb";

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
  delete process.env.EXPO_PUBLIC_TMDB_TOKEN;
});

test("searchTitles calls /search/multi with bearer auth and normalizes", async () => {
  process.env.EXPO_PUBLIC_TMDB_TOKEN = "test-token";
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      results: [
        { media_type: "movie", id: 1, title: "Dune", release_date: "2021-01-01", vote_average: 8 },
      ],
    }),
  });
  global.fetch = fetchMock as any;

  const out = await searchTitles("dune");

  const [url, opts] = fetchMock.mock.calls[0];
  expect(url).toContain("https://api.themoviedb.org/3/search/multi");
  expect(url).toContain("query=dune");
  expect(opts.headers.Authorization).toBe("Bearer test-token");
  expect(out).toEqual([
    { tmdbId: 1, mediaType: "movie", title: "Dune", year: "2021", posterPath: null, rating: 8, originalLanguage: null },
  ]);
});

test("searchTitles returns [] for blank query without fetching", async () => {
  process.env.EXPO_PUBLIC_TMDB_TOKEN = "test-token";
  const fetchMock = jest.fn();
  global.fetch = fetchMock as any;
  expect(await searchTitles("   ")).toEqual([]);
  expect(fetchMock).not.toHaveBeenCalled();
});

test("throws 'TMDB not configured' when token missing", async () => {
  const fetchMock = jest.fn();
  global.fetch = fetchMock as any;
  await expect(getTitleDetails("movie", 1)).rejects.toThrow("TMDB not configured");
  expect(fetchMock).not.toHaveBeenCalled();
});
