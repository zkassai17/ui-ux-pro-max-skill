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

test("cleanTitle handles spelled-out season/episode names (the bug)", () => {
  // Netflix uses spelled-out counts for some shows — these used to slip through.
  expect(cleanTitle("Avatar: The Last Airbender: Book One: The Boy in the Iceberg")).toBe("Avatar: The Last Airbender");
  expect(cleanTitle("Stranger Things: Chapter One: The Vanishing of Will Byers")).toBe("Stranger Things");
  expect(cleanTitle("The Chosen: Season One: I Have Called You by Name")).toBe("The Chosen");
});

test("cleanTitle collapses deep episode rows even without a known marker", () => {
  // 3+ segments with an unknown middle label still collapse (drop the episode).
  expect(cleanTitle("The Show: Collection 1: Some Episode")).toBe("The Show: Collection 1");
});

test("cleanTitle does not over-trim real subtitles", () => {
  expect(cleanTitle("Mission: Impossible")).toBe("Mission: Impossible");
  expect(cleanTitle("Book Club: The Next Chapter")).toBe("Book Club: The Next Chapter");
});

test("parseWatchHistory collapses spelled-out episodes to one show", () => {
  const csv = [
    "Title,Date",
    '"Avatar: The Last Airbender: Book One: The Boy in the Iceberg","1/2/24"',
    '"Avatar: The Last Airbender: Book One: The Avatar Returns","1/3/24"',
  ].join("\n");
  expect(parseWatchHistory(csv)).toEqual(["Avatar: The Last Airbender"]);
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
