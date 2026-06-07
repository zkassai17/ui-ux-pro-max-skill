import { cleanTitle, parseWatchHistory } from "../src/lib/importHistory";

test("cleanTitle strips Netflix season/episode suffixes", () => {
  expect(cleanTitle("Cobra Kai: Season 1: Episode 3")).toBe("Cobra Kai");
  expect(cleanTitle("Stranger Things: Season 4: Chapter One")).toBe("Stranger Things");
  expect(cleanTitle("The Crown: Season 2")).toBe("The Crown");
});

test("cleanTitle keeps titles whose colon is part of the name", () => {
  expect(cleanTitle("Mission: Impossible")).toBe("Mission: Impossible");
  expect(cleanTitle("Avatar: The Last Airbender")).toBe("Avatar: The Last Airbender");
});

test("cleanTitle handles limited series / part / volume markers", () => {
  expect(cleanTitle("Beef: Limited Series: Episode 1")).toBe("Beef");
  expect(cleanTitle("Money Heist: Part 3: Episode 2")).toBe("Money Heist");
  expect(cleanTitle("Arcane: Volume 1: Welcome")).toBe("Arcane");
});

test("parseWatchHistory reads a Netflix CSV and collapses episodes to one show", () => {
  const csv = [
    "Title,Date",
    '"Cobra Kai: Season 1: Episode 1","1/2/24"',
    '"Cobra Kai: Season 1: Episode 2","1/3/24"',
    '"Knives Out","2/2/24"',
  ].join("\n");
  expect(parseWatchHistory(csv)).toEqual(["Cobra Kai", "Knives Out"]);
});

test("parseWatchHistory handles quoted titles containing commas", () => {
  const csv = ['Title,Date', '"Tick, Tick... Boom!","3/1/24"'].join("\n");
  expect(parseWatchHistory(csv)).toEqual(["Tick, Tick... Boom!"]);
});

test("parseWatchHistory accepts a plain pasted list, one title per line", () => {
  const pasted = "Interstellar\nThe Bear\n\nThe Bear\n";
  expect(parseWatchHistory(pasted)).toEqual(["Interstellar", "The Bear"]);
});

test("parseWatchHistory dedupes case-insensitively and strips BOM/CRLF", () => {
  const raw = "﻿Title,Date\r\n\"The Matrix\",\"1/1/24\"\r\n\"the matrix\",\"1/2/24\"\r\n";
  expect(parseWatchHistory(raw)).toEqual(["The Matrix"]);
});
