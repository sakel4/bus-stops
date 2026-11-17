import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLang, languages, ui, type Lang, type UiKey } from './ui';

export function isLang(value: string | undefined): value is Lang {
  return !!value && value in languages;
}

/** Resolve the language from Astro.currentLocale (falls back to the default). */
export function getLang(locale: string | undefined): Lang {
  return isLang(locale) ? locale : defaultLang;
}

/** Returns a translator bound to a language. Supports `{name}` placeholders. */
export function useTranslations(lang: Lang) {
  return function t(key: UiKey, params?: Record<string, string | number>): string {
    let text: string = ui[lang][key] ?? ui[defaultLang][key];
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  };
}

/** Localized URL for a path, e.g. localizePath('en', 'stops/0122') -> '/en/stops/0122/' */
export function localizePath(lang: Lang, path = ''): string {
  return getRelativeLocaleUrl(lang, path);
}
