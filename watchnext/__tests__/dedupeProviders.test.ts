import { dedupeProviders } from "../src/lib/tmdbNormalize";
import type { WatchProvider } from "../src/types/tmdb";

function p(name: string, id: number): WatchProvider {
  return { providerId: id, name, logoPath: `/${id}.png` };
}

describe("dedupeProviders", () => {
  it("collapses channel variants into one entry, keeping the clean name", () => {
    const out = dedupeProviders([
      p("MGM+ Amazon Channel", 1),
      p("MGM+ Roku Premium Channel", 2),
      p("MGM+", 3),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("MGM+");
  });

  it("folds 'X Plus' and 'X+' together", () => {
    const out = dedupeProviders([p("MGM Plus Amazon Channel", 1), p("MGM+", 2)]);
    expect(out.map((x) => x.name)).toEqual(["MGM+"]);
  });

  it("collapses ad-supported tiers", () => {
    const out = dedupeProviders([
      p("Netflix", 1),
      p("Netflix Standard with Ads", 2),
      p("Netflix basic with Ads", 3),
    ]);
    expect(out.map((x) => x.name)).toEqual(["Netflix"]);
  });

  it("keeps genuinely different platforms and preserves first-seen order", () => {
    const out = dedupeProviders([
      p("fuboTV", 1),
      p("YouTube TV", 2),
      p("Philo", 3),
      p("Spectrum On Demand", 4),
    ]);
    expect(out.map((x) => x.name)).toEqual(["fuboTV", "YouTube TV", "Philo", "Spectrum On Demand"]);
  });

  it("keeps the variant if no clean base exists", () => {
    const out = dedupeProviders([p("MGM+ Amazon Channel", 1)]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe("MGM+ Amazon Channel");
  });
});
