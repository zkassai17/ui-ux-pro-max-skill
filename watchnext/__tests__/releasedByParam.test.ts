import { releasedByParam } from "../src/lib/tmdbNormalize";

describe("releasedByParam", () => {
  it("uses release_date.lte for movies", () => {
    expect(releasedByParam("movie", "2026-07-06")).toEqual(["release_date.lte", "2026-07-06"]);
  });
  it("uses first_air_date.lte for TV", () => {
    expect(releasedByParam("tv", "2026-07-06")).toEqual(["first_air_date.lte", "2026-07-06"]);
  });
  it("passes the given date through as the ceiling", () => {
    const [, value] = releasedByParam("movie", "2001-01-01");
    expect(value).toBe("2001-01-01");
  });
});
