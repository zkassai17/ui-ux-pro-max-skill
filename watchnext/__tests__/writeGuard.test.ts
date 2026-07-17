import { assertWrote } from "../src/lib/writeGuard";

test("passes when the write actually touched a row", () => {
  expect(() => assertWrote([{ id: "abc" }], "That change didn't save.")).not.toThrow();
});

test("throws when the write matched no rows (silent no-op)", () => {
  expect(() => assertWrote([], "That change didn't save.")).toThrow(/didn't save/);
  expect(() => assertWrote(null, "Your rating didn't save.")).toThrow(/Your rating didn't save/);
  expect(() => assertWrote(undefined, "Your review didn't save.")).toThrow(/Your review didn't save/);
});

test("tells the user what to do next", () => {
  expect(() => assertWrote([], "That change didn't save.")).toThrow(/Pull to refresh and try again/);
});
