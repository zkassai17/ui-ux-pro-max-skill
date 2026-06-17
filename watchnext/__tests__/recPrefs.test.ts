import { levelIndex, matchPreset, REC_PRESETS, DEFAULT_REC_WEIGHTS } from "../src/lib/recPrefs";

describe("levelIndex", () => {
  it("maps a weight to its nearest level", () => {
    expect(levelIndex("content", 0)).toBe(0); // Off
    expect(levelIndex("content", 1.0)).toBe(2); // Med
    expect(levelIndex("content", 1.5)).toBe(3); // High
    expect(levelIndex("trending", 0.2)).toBe(1); // Low
  });

  it("snaps an in-between value to the closest level", () => {
    expect(levelIndex("content", 0.55)).toBe(1); // closest to 0.6
  });
});

describe("matchPreset", () => {
  it("recognizes each preset", () => {
    for (const p of REC_PRESETS) {
      expect(matchPreset(p.weights)).toBe(p.key);
    }
  });

  it("returns null for custom weights", () => {
    expect(matchPreset({ content: 0.9, collaborative: 0.3, trending: 0.7 })).toBeNull();
  });

  it("default weights match the Balanced preset", () => {
    expect(matchPreset(DEFAULT_REC_WEIGHTS)).toBe("balanced");
  });
});
