// Types and helpers for live arrivals, shared by the API endpoint and the browser.

import type { Lang } from '../i18n/ui';
import type { Stop } from './stops';

export interface Arrival {
  line: string;
  destination: string;
  /** Minutes until the bus reaches the stop (0 = arriving now). */
  minutes: number;
}

/** Body of GET /api/stops/{code}/live. */
export interface LiveArrivalsResponse {
  arrivals: Arrival[];
  /** ISO time the data was fetched from citybus. */
  updatedAt: string;
}

/** URL of our own live arrivals endpoint (src/pages/api/stops/[code]/live.ts). */
export function getLiveArrivalsUrl(stop: Pick<Stop, 'code'>, lang: Lang): string {
  return `/api/stops/${stop.code}/live?lang=${lang}`;
}
