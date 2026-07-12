import { afterEach, describe, expect, it } from "vitest";
import { detectInitialLang, interpolate } from "./LanguageContext";

describe("interpolate", () => {
  it("substitutes {var} placeholders", () => {
    expect(interpolate("Bonjour {name} !", { name: "Sophie" })).toBe("Bonjour Sophie !");
  });

  it("substitutes numbers", () => {
    expect(interpolate("{n} ans", { n: 7 })).toBe("7 ans");
  });

  it("leaves unknown placeholders intact", () => {
    expect(interpolate("Bonjour {name} !", { other: "x" })).toBe("Bonjour {name} !");
  });

  it("returns the template unchanged when vars are omitted", () => {
    expect(interpolate("Bonjour {name} !")).toBe("Bonjour {name} !");
  });

  it("substitutes repeated placeholders", () => {
    expect(interpolate("{a} et {a}", { a: "encore" })).toBe("encore et encore");
  });
});

describe("detectInitialLang", () => {
  const setNavigatorLanguage = (value: string) => {
    Object.defineProperty(window.navigator, "language", {
      value,
      configurable: true,
    });
  };

  afterEach(() => {
    window.localStorage.clear();
  });

  it("prefers a valid saved language over the browser preference", () => {
    window.localStorage.setItem("lisons.lang", "en");
    setNavigatorLanguage("fr-CA");
    expect(detectInitialLang()).toBe("en");
  });

  it("ignores an invalid saved value", () => {
    window.localStorage.setItem("lisons.lang", "klingon");
    setNavigatorLanguage("fr-CA");
    expect(detectInitialLang()).toBe("fr");
  });

  it("maps an English browser preference to en", () => {
    setNavigatorLanguage("en-US");
    expect(detectInitialLang()).toBe("en");
  });

  it("defaults to fr for anything not explicitly English", () => {
    setNavigatorLanguage("de-DE");
    expect(detectInitialLang()).toBe("fr");
  });
});
