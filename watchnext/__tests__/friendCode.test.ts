import { generateFriendCode, isValidFriendCode, FRIEND_CODE_ALPHABET } from "../src/lib/friendCode";

test("generates an 8-char code from the safe alphabet", () => {
  const code = generateFriendCode();
  expect(code).toHaveLength(8);
  for (const ch of code) {
    expect(FRIEND_CODE_ALPHABET).toContain(ch);
  }
});

test("alphabet excludes ambiguous characters", () => {
  for (const ch of "01OI") {
    expect(FRIEND_CODE_ALPHABET).not.toContain(ch);
  }
});

test("validates well-formed codes and rejects bad ones", () => {
  expect(isValidFriendCode(generateFriendCode())).toBe(true);
  expect(isValidFriendCode("short")).toBe(false);
  expect(isValidFriendCode("abcdefgh")).toBe(false); // lowercase
  expect(isValidFriendCode("ABCDE0OI")).toBe(false); // ambiguous chars
});
