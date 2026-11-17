// Types and helpers for line pages, shared by the API endpoint, the pages and the browser.
// Browser code should only import types from here.

import type { Lang } from '../i18n/ui';
import { localizePath } from '../i18n/utils';
import { getStops } from './stops';

export interface LineStop {
  code: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface LineRoute {
  code: string;
  /** Route name from citybus, e.g. 'ΠΑΝΕΠΙΣΤΗΜΙΟ - ΑΕΡΟΔΡΟΜΙΟ'. */
  name: string;
  /** The road the bus takes, as [latitude, longitude] pairs. */
  path: [number, number][];
  /** Stops in the order the bus reaches them. */
  stops: LineStop[];
}

/** Body of GET /api/lines/{line}. */
export interface LineDetailsResponse {
  code: string;
  /** Line name from citybus, e.g. 'ΑΕΡΟΔΡΟΜΙΟ'. */
  name: string;
  routes: LineRoute[];
}

/** Every line code serving at least one stop, sorted ('01', '02', …). */
export function getLineCodes(): string[] {
  const codes = new Set<string>();
  for (const lang of ['el', 'en'] satisfies Lang[]) {
    for (const stop of getStops(lang)) for (const line of stop.lineCodes) codes.add(line);
  }
  return [...codes].sort();
}

/** Path of the line page without locale prefix, e.g. 'lines/06'. */
export function getLinePath(line: string): string {
  return `lines/${line}`;
}

/**
 * Localized URL of the line page (src/pages/[en/]lines/[line].astro). With `fromStop`, the page
 * opens on a route through that stop, highlights it and links back to it.
 */
export function getLineUrl(line: string, lang: Lang, fromStop?: string): string {
  const url = localizePath(lang, getLinePath(line));
  return fromStop ? `${url}?stop=${fromStop}` : url;
}

/** URL of our own line endpoint (src/pages/api/lines/[line].ts). */
export function getLineDetailsUrl(line: string, lang: Lang): string {
  return `/api/lines/${line}?lang=${lang}`;
}
