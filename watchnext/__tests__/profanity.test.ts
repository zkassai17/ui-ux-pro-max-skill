import { containsProfanity } from "../src/lib/profanity";

test("flags obvious profanity and slurs", () => {
  expect(containsProfanity("this movie is shit")).toBe(true);
  expect(containsProfanity("what an asshole")).toBe(true);
  expect(containsProfanity("FUCK this")).toBe(true); // case-insensitive
});

test("catches simple leetspeak substitutions", () => {
  expect(containsProfanity("total sh1t")).toBe(true);
  expect(containsProfanity("f4g")).toBe(true);
});

test("does not flag clean text or the Scunthorpe problem", () => {
  expect(containsProfanity("A masterpiece, loved every minute")).toBe(false);
  expect(containsProfanity("")).toBe(false);
  expect(containsProfanity("the assassin was brilliant")).toBe(false); // 'ass' inside a word
  expect(containsProfanity("Scunthorpe United")).toBe(false);
});
