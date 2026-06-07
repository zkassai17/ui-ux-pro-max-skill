import { RATING_SCALE, ratingLevel, ratingEmoji, ratingLabel } from "../src/lib/ratingScale";

test("scale covers exactly 1 through 5 in order", () => {
  expect(RATING_SCALE.map((l) => l.value)).toEqual([1, 2, 3, 4, 5]);
});

test("ratingLevel maps a value to its level and null otherwise", () => {
  expect(ratingLevel(5)?.label).toBe("Loved it");
  expect(ratingLevel(1)?.label).toBe("Bad");
  expect(ratingLevel(null)).toBeNull();
  expect(ratingLevel(9)).toBeNull();
});

test("ratingEmoji and ratingLabel resolve or return null", () => {
  expect(ratingEmoji(4)).toBe("😀");
  expect(ratingLabel(3)).toBe("Good");
  expect(ratingEmoji(null)).toBeNull();
  expect(ratingLabel(0)).toBeNull();
});
