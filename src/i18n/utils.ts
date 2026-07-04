import { defaultLang, ui, type Lang, type UiKey } from "./ui";

/** Plain TS (no Astro-only APIs) so it works unchanged from both `.astro`
 * files and the React islands. Falls back to English for any key not yet
 * translated in a given locale — lets a new language be added incrementally
 * without ever rendering `undefined`. */
export function useTranslations(lang: Lang) {
  return function t(key: UiKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/** Strips a leading locale-folder segment (e.g. `/es/` or `/fr`) so the
 * remaining path can be re-prefixed for any target locale — used by the
 * header switcher and by Layout's hreflang alternates. The default locale
 * is never prefixed, so there's nothing to strip for `en`. */
export function getPathWithoutLocale(pathname: string, locales: Lang[]): string {
  const nonDefault = locales.filter((l) => l !== defaultLang);
  if (nonDefault.length === 0) return pathname;
  const pattern = new RegExp(`^/(${nonDefault.join("|")})(/|$)`);
  return pathname.replace(pattern, "/");
}
