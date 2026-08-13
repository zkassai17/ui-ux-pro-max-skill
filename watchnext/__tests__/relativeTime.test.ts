import { relativeTime } from "../src/lib/relativeTime";

const NOW = Date.parse("2026-06-22T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;

describe("relativeTime", () => {
  it("shows 'now' under a minute", () => {
    expect(relativeTime(ago(30 * SEC), NOW)).toBe("now");
  });
  it("minutes, hours, days", () => {
    expect(relativeTime(ago(5 * MIN), NOW)).toBe("5m");
    expect(relativeTime(ago(2 * HOUR), NOW)).toBe("2h");
    expect(relativeTime(ago(3 * DAY), NOW)).toBe("3d");
  });
  it("weeks, months, years", () => {
    expect(relativeTime(ago(14 * DAY), NOW)).toBe("2w");
    expect(relativeTime(ago(60 * DAY), NOW)).toBe("2mo");
    expect(relativeTime(ago(400 * DAY), NOW)).toBe("1y");
  });
  it("never goes negative for a future timestamp", () => {
    expect(relativeTime(ago(-1000), NOW)).toBe("now");
  });
  it("returns empty for an unparseable date", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("");
  });
});
