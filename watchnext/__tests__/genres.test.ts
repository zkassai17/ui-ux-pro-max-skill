import { GENRES } from "../src/lib/genres";

test("every genre has a label and at least one tmdb id", () => {
  for (const g of GENRES) {
    expect(g.label.length).toBeGreaterThan(0);
    expect(g.ids.length).toBeGreaterThan(0);
    expect(g.ids.every((id) => typeof id === "number")).toBe(true);
  }
});

test("genre labels are unique", () => {
  const labels = GENRES.map((g) => g.label);
  expect(new Set(labels).size).toBe(labels.length);
});
