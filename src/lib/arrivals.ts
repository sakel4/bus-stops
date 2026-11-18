// Types and helpers for live arrivals, shared by the API endpoint and the browser.

import type { Lang } from '../i18n/ui';
import type { Stop } from './stops';

export interface Arrival {
  line: string;
  destination: string;
  /** Minutes until the bus reaches the stop (0 = arriving now). */
  minutes: number;
  /** Where the bus is now, as [latitude, longitude]; null when citybus doesn't know. */
  position: [number, number] | null;
}

/** Detail of the 'stop:arrivals' event StopArrivals.astro sends to the stop map; `time` is e.g. '5 min'. */
export interface StopArrivalsDetail {
  arrivals: (Arrival & { time: string })[];
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
