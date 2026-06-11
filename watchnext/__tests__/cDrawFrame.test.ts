import { cDrawFrame } from "../src/lib/cDrawFrame";

describe("cDrawFrame", () => {
  it("matches the 0% keyframe", () => {
    expect(cDrawFrame(0)).toEqual({ dashA: 14, dashB: 86, offset: 0 });
  });

  it("matches the 50% keyframe", () => {
    expect(cDrawFrame(0.5)).toEqual({ dashA: 62, dashB: 38, offset: -30 });
  });

  it("wraps 1.0 back to the 0% keyframe (seamless loop)", () => {
    expect(cDrawFrame(1)).toEqual({ dashA: 14, dashB: 86, offset: 0 });
  });

  it("always keeps dashA + dashB === 100 (pathLength)", () => {
    for (const p of [0, 0.1, 0.25, 0.5, 0.73, 0.99]) {
      const f = cDrawFrame(p);
      expect(f.dashA + f.dashB).toBeCloseTo(100, 6);
    }
  });

  it("interpolates linearly within the first half", () => {
    const f = cDrawFrame(0.25);
    expect(f.dashA).toBeCloseTo(38, 6); // halfway 14 -> 62
    expect(f.offset).toBeCloseTo(-15, 6); // halfway 0 -> -30
  });

  it("interpolates linearly within the second half", () => {
    const f = cDrawFrame(0.75);
    expect(f.dashA).toBeCloseTo(38, 6); // halfway 62 -> 14
    expect(f.offset).toBeCloseTo(-65, 6); // halfway -30 -> -100
  });

  it("wraps negative phase", () => {
    expect(cDrawFrame(-1)).toEqual(cDrawFrame(0));
  });

  it("offset decreases monotonically across the loop (draw travels one way)", () => {
    let prev = Infinity;
    for (let p = 0; p < 1; p += 0.05) {
      const { offset } = cDrawFrame(p);
      expect(offset).toBeLessThanOrEqual(prev + 1e-9);
      prev = offset;
    }
  });
});
