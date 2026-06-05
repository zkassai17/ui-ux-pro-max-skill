import { normalizeUsername, isValidUsername } from "../src/lib/username";

test("normalizes to lowercase and trims", () => {
  expect(normalizeUsername("  Zach_17 ")).toBe("zach_17");
});

test("accepts valid usernames", () => {
  expect(isValidUsername("zach_17")).toBe(true);
  expect(isValidUsername("abc")).toBe(true);
});

test("rejects invalid usernames", () => {
  expect(isValidUsername("ab")).toBe(false);          // too short
  expect(isValidUsername("1abc")).toBe(false);        // starts with number
  expect(isValidUsername("has space")).toBe(false);   // space
  expect(isValidUsername("a".repeat(21))).toBe(false); // too long
});
