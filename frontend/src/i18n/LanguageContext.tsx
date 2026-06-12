import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { LANGS, translations } from "./translations";
import type { Lang, TranslationKey } from "./translations";

const STORAGE_KEY = "lisons.lang";

type Vars = Record<string, string | number>;

interface I18nState {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Translate a key, interpolating `{var}` placeholders from `vars`. */
  t: (key: TranslationKey, vars?: Vars) => string;
  /** "<n> creation(s)" with the correct singular/plural noun for the language. */
  countWorks: (n: number) => string;
}

const I18nCtx = createContext<I18nState | null>(null);

function isLang(value: string | null): value is Lang {
  return value != null && (LANGS as readonly string[]).includes(value);
}

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "fr";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (isLang(saved)) return saved;
  // Fall back to the browser preference, defaulting to French (the site's
  // first language) for anything that isn't explicitly English.
  return window.navigator.language?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function interpolate(template: string, vars?: Vars): string {
  if (vars == null) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);

  const t = useCallback(
    (key: TranslationKey, vars?: Vars) => interpolate(translations[lang][key], vars),
    [lang],
  );

  const countWorks = useCallback(
    (n: number) => `${n} ${translations[lang][n === 1 ? "works.one" : "works.other"]}`,
    [lang],
  );

  const value = useMemo<I18nState>(
    () => ({ lang, setLang, t, countWorks }),
    [lang, setLang, t, countWorks],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nCtx);
  if (ctx == null) {
    throw new Error("useI18n must be used inside <LanguageProvider>");
  }
  return ctx;
}
