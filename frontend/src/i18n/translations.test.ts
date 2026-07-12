import { describe, expect, it } from "vitest";
import { LANGS, LANG_LABELS, translations } from "./translations";

describe("translations", () => {
  it("has a table for every declared language", () => {
    for (const lang of LANGS) {
      expect(translations[lang]).toBeDefined();
    }
  });

  it("has identical key sets in fr and en", () => {
    const frKeys = Object.keys(translations.fr).sort();
    const enKeys = Object.keys(translations.en).sort();
    expect(enKeys).toEqual(frKeys);
  });

  it("has no empty values in any language", () => {
    for (const lang of LANGS) {
      for (const [key, value] of Object.entries(translations[lang])) {
        expect(value.trim(), `${lang}:${key}`).not.toBe("");
      }
    }
  });

  it("has a label for every language", () => {
    for (const lang of LANGS) {
      expect(LANG_LABELS[lang].trim()).not.toBe("");
    }
  });
});
