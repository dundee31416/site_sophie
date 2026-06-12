import { useI18n } from "../i18n/LanguageContext";
import { LANGS } from "../i18n/translations";

/** Segmented FR / EN switch for the public header. */
export function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-toggle" role="group" aria-label={t("lang.switch")}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className={lang === l ? "on" : ""}
          aria-pressed={lang === l}
          onClick={() => setLang(l)}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
