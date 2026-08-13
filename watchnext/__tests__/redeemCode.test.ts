import { isValidRedeemCode, PRO_REDEEM_CODE } from "../src/pro/redeemCode";

describe("isValidRedeemCode", () => {
  it("accepts the exact code", () => {
    expect(isValidRedeemCode(PRO_REDEEM_CODE)).toBe(true);
  });
  it("is case-insensitive and trims whitespace", () => {
    expect(isValidRedeemCode(`  ${PRO_REDEEM_CODE.toLowerCase()} `)).toBe(true);
  });
  it("rejects a wrong code", () => {
    expect(isValidRedeemCode("nope")).toBe(false);
  });
  it("rejects an empty string", () => {
    expect(isValidRedeemCode("")).toBe(false);
  });
});
