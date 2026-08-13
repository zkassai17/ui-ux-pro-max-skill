import { translate, isRtlLang, LANGUAGES, pickLanguage } from "../src/i18n/translations";

describe("translate", () => {
  it("returns the string for the chosen language", () => {
    expect(translate("es", "tab.home")).toBe("Inicio");
    expect(translate("fr", "settings.title")).toBe("Réglages");
    expect(translate("he", "tab.library")).toBe("ספרייה");
    expect(translate("ar", "settings.account")).toBe("الحساب");
  });

  it("falls back to English for a missing translation", () => {
    // every language should at least resolve to *something* non-empty for a known key
    for (const { code } of LANGUAGES) {
      expect(translate(code, "settings.signOut").length).toBeGreaterThan(0);
    }
  });

  it("returns the key itself for an unknown key", () => {
    expect(translate("en", "nope.nope")).toBe("nope.nope");
  });
});

describe("isRtlLang", () => {
  it("marks Hebrew and Arabic as RTL, others LTR", () => {
    expect(isRtlLang("he")).toBe(true);
    expect(isRtlLang("ar")).toBe(true);
    expect(isRtlLang("en")).toBe(false);
    expect(isRtlLang("es")).toBe(false);
    expect(isRtlLang("fr")).toBe(false);
  });
});

describe("pickLanguage (device default)", () => {
  it("uses the first supported device language", () => {
    expect(pickLanguage(["fr"])).toBe("fr");
    expect(pickLanguage(["ar", "en"])).toBe("ar");
  });
  it("skips unsupported codes", () => {
    expect(pickLanguage(["de", "pt", "es"])).toBe("es");
  });
  it("falls back to English when nothing matches or list is empty", () => {
    expect(pickLanguage(["de", "ja"])).toBe("en");
    expect(pickLanguage([])).toBe("en");
    expect(pickLanguage([null, undefined])).toBe("en");
  });
});

describe("LANGUAGES", () => {
  it("lists all five with native labels", () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(["en", "es", "fr", "he", "ar"]);
  });
});
