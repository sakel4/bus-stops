import stopsEl from '../data/stops_el.json';
import stopsEn from '../data/stops_en.json';
import { defaultLang, type Lang } from '../i18n/ui';
import { localizePath } from '../i18n/utils';

/** A stop as stored in src/data/stops_<lang>.json. */
interface RawStop {
  id: number;
  code: string;
  name: string | null;
  latitude: number;
  longitude: number;
  lineCodes: string[];
  routeCodes: string[];
}

export interface Stop {
  id: number;
  code: string;
  /** Name in every language; falls back to the Greek name where a translation is missing. */
  names: Record<Lang, string>;
  latitude: number;
  longitude: number;
  lineCodes: string[];
  routeCodes: string[];
}

/** One data file per language; each language's pages use its own file. */
const rawStops = {
  el: stopsEl as RawStop[],
  en: stopsEn as RawStop[],
} satisfies Record<Lang, RawStop[]>;

const langs = Object.keys(rawStops) as Lang[];

const nameIndex = Object.fromEntries(
  langs.map((lang) => [
    lang,
    new Map(rawStops[lang].map((stop) => [stop.code, stop.name?.trim() || null])),
  ]),
) as Record<Lang, Map<string, string | null>>;

function getNames(code: string): Record<Lang, string> {
  const fallback = nameIndex[defaultLang].get(code) ?? code;
  return Object.fromEntries(
    langs.map((lang) => [lang, nameIndex[lang].get(code) ?? fallback]),
  ) as Record<Lang, string>;
}

const stopsByLang = Object.fromEntries(
  langs.map((lang) => [
    lang,
    rawStops[lang]
      .map(({ name: _, ...stop }) => ({ ...stop, names: getNames(stop.code) }))
      .sort((a, b) => a.names[lang].localeCompare(b.names[lang], lang)),
  ]),
) as Record<Lang, Stop[]>;

/** All stops from the given language's data file, sorted by name in that language. */
export function getStops(lang: Lang): Stop[] {
  return stopsByLang[lang];
}

/** Name of a stop in the given language. */
export function getStopName(stop: Stop, lang: Lang): string {
  return stop.names[lang];
}

/** Path of the stop details page without locale prefix, e.g. 'stops/0122'. */
export function getStopPath(stop: Pick<Stop, 'code'>): string {
  return `stops/${stop.code}`;
}

/** Localized URL of the stop details page (src/pages/[en/]stops/[code].astro). */
export function getStopUrl(stop: Pick<Stop, 'code'>, lang: Lang): string {
  return localizePath(lang, getStopPath(stop));
}
