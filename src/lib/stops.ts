import rawStops from '../data/stops.json';
import type { Lang } from '../i18n/ui';
import { localizePath } from '../i18n/utils';

export interface Stop {
  id: number;
  code: string;
  /** Name in Greek (source data). */
  name: string;
  /** Optional translated names, e.g. { en: '62 Martyron 200 - Jambo' }. */
  names?: Partial<Record<Lang, string>>;
  latitude: number;
  longitude: number;
  lineCodes: string[];
  routeCodes: string[];
}

export const stops: Stop[] = (rawStops as Stop[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name, 'el'));

/** Name of a stop in the given language, falling back to the Greek source name. */
export function getStopName(stop: Stop, lang: Lang): string {
  return stop.names?.[lang] ?? stop.name;
}

/**
 * URL of the (future) stop details page.
 * Not linked yet — when the page exists, create src/pages/stops/[code].astro
 * (and src/pages/en/stops/[code].astro) and use this helper for navigation.
 */
export function getStopUrl(stop: Pick<Stop, 'code'>, lang: Lang): string {
  return localizePath(lang, `stops/${stop.code}`);
}
