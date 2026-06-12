// Central French/English translation table for the public site.
//
// Keys are flat, dot-namespaced strings. Use `{name}`-style placeholders for
// runtime interpolation (handled by `t(key, vars)` in LanguageContext).
// Both languages MUST share the same set of keys — the `TranslationKey` type
// below is derived from the French table, so any key missing in English is a
// compile error.

export const LANGS = ["fr", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const LANG_LABELS: Record<Lang, string> = {
  fr: "Français",
  en: "English",
};

const fr = {
  // Header / chrome
  "search.placeholder": "Chercher un titre…",
  "nav.sections": "Sections",
  "lang.switch": "Langue",

  // Section labels (sidebar + tabs)
  "section.all.label": "Tout",
  "section.book.label": "Livres",
  "section.comic.label": "Bandes dessinées",
  "section.drawing.label": "Dessins",
  "section.craft.label": "Bricolages",

  // Section headings (shown above the grid)
  "section.all.h1": "Toutes les créations de la maison",
  "section.all.sub": "Livres, bandes dessinées, dessins et bricolages, réunis au même endroit.",
  "section.book.h1": "La bibliothèque de la maison",
  "section.book.sub": "Des histoires écrites, dessinées et inventées à la maison.",
  "section.comic.h1": "Les bandes dessinées de la maison",
  "section.comic.sub": "Cases, bulles, et bruits d'animaux.",
  "section.drawing.h1": "La galerie de la maison",
  "section.drawing.sub": "Tous les dessins faits à la main.",
  "section.craft.h1": "L'atelier bricolage de la maison",
  "section.craft.sub": "Des objets découpés, collés et bricolés à la maison.",

  // Author picker
  "author.choose": "Choisis un auteur :",
  "author.everyone": "Tout le monde",
  "author.years": "{n} ans",
  "author.unknownAge": "—",

  // Counts / states
  "count.loading": "Chargement…",
  "count.none": "Aucune création trouvée…",
  "count.forQuery": " pour « {q} »",
  "works.one": "création",
  "works.other": "créations",

  // Empty state
  "empty.title": "Oups, rien ici !",
  "empty.sub": "Essaie un autre titre ou un autre auteur.",

  // Shared
  "work.by": "par {name}",

  // Reader
  "reader.ageSuffix": ", {n} ans",
  "reader.shelf": "Étagère",
  "reader.notFound": "Œuvre introuvable",
  "reader.loading": "Chargement…",
  "reader.digital": "Numérique",
  "reader.original": "Original",
  "reader.page": "Page {n} / {total}",
  "reader.prevPage": "Page précédente",
  "reader.nextPage": "Page suivante",
  "reader.pageN": "Page {n}",
  "reader.noImage": "Aucune image.",
  "reader.noPage": "Aucune page",
  "reader.emptyPage": "(page vide)",
} as const;

export type TranslationKey = keyof typeof fr;

const en: Record<TranslationKey, string> = {
  // Header / chrome
  "search.placeholder": "Search for a title…",
  "nav.sections": "Sections",
  "lang.switch": "Language",

  // Section labels (sidebar + tabs)
  "section.all.label": "All",
  "section.book.label": "Books",
  "section.comic.label": "Comics",
  "section.drawing.label": "Drawings",
  "section.craft.label": "Crafts",

  // Section headings (shown above the grid)
  "section.all.h1": "Everything made at home",
  "section.all.sub": "Books, comics, drawings and crafts, all in one place.",
  "section.book.h1": "The home library",
  "section.book.sub": "Stories written, drawn and invented at home.",
  "section.comic.h1": "The home comics",
  "section.comic.sub": "Panels, speech bubbles, and animal noises.",
  "section.drawing.h1": "The home gallery",
  "section.drawing.sub": "Every drawing made by hand.",
  "section.craft.h1": "The home craft workshop",
  "section.craft.sub": "Things cut out, glued and crafted at home.",

  // Author picker
  "author.choose": "Pick an author:",
  "author.everyone": "Everyone",
  "author.years": "age {n}",
  "author.unknownAge": "—",

  // Counts / states
  "count.loading": "Loading…",
  "count.none": "No creations found…",
  "count.forQuery": " for “{q}”",
  "works.one": "creation",
  "works.other": "creations",

  // Empty state
  "empty.title": "Oops, nothing here!",
  "empty.sub": "Try another title or another author.",

  // Shared
  "work.by": "by {name}",

  // Reader
  "reader.ageSuffix": ", age {n}",
  "reader.shelf": "Shelf",
  "reader.notFound": "Work not found",
  "reader.loading": "Loading…",
  "reader.digital": "Digital",
  "reader.original": "Original",
  "reader.page": "Page {n} / {total}",
  "reader.prevPage": "Previous page",
  "reader.nextPage": "Next page",
  "reader.pageN": "Page {n}",
  "reader.noImage": "No image.",
  "reader.noPage": "No page",
  "reader.emptyPage": "(empty page)",
};

export const translations: Record<Lang, Record<TranslationKey, string>> = { fr, en };
