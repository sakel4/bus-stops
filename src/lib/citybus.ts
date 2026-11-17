// Server-only client for the citybus REST API. Never import this from browser code.

import { CITYBUS_TOKEN } from 'astro:env/server';
import type { Lang } from '../i18n/ui';
import type { Arrival } from './arrivals';

const API_URL = 'https://rest.citybus.gr/api/v1';
// Heraklion's id in the citybus API.
const CITY_ID = 110;
const CACHE_MS = 20_000;
const TIMEOUT_MS = 8_000;

interface LiveArrivals {
  arrivals: Arrival[];
  fetchedAt: number;
}

// One entry per stop and language; concurrent requests for it share one upstream call.
const cache = new Map<string, { at: number; data: Promise<LiveArrivals> }>();

export function getLiveArrivals(code: string, lang: Lang): Promise<LiveArrivals> {
  const key = `${lang}:${code}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;

  const entry = { at: Date.now(), data: fetchLiveArrivals(code, lang) };
  cache.set(key, entry);
  // Don't keep failures around; the next request should try again.
  entry.data.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return entry.data;
}

async function fetchLiveArrivals(code: string, lang: Lang): Promise<LiveArrivals> {
  if (!CITYBUS_TOKEN) throw new Error('CITYBUS_TOKEN is not set');

  const res = await fetch(`${API_URL}/${lang}/${CITY_ID}/stops/live/${encodeURIComponent(code)}`, {
    headers: { Authorization: `Bearer ${CITYBUS_TOKEN}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 401) {
    throw new Error('citybus rejected the token (401); CITYBUS_TOKEN may have changed');
  }
  if (!res.ok) throw new Error(`citybus responded with ${res.status}`);

  return { arrivals: parseArrivals(await res.json()), fetchedAt: Date.now() };
}

/**
 * ASSUMED response shape: not yet checked against a real citybus response.
 * Adjust this interface and parseArrivals() once a sample response is available.
 */
interface UpstreamLiveResponse {
  vehicles: {
    lineCode: string;
    routeName: string;
    departureMins: number;
  }[];
}

function parseArrivals(raw: unknown): Arrival[] {
  const vehicles = (raw as Partial<UpstreamLiveResponse> | null)?.vehicles;
  if (!Array.isArray(vehicles)) {
    throw new Error(`Unexpected citybus response: ${JSON.stringify(raw).slice(0, 300)}`);
  }

  return vehicles
    .map((v) => ({
      line: String(v.lineCode),
      destination: String(v.routeName ?? ''),
      minutes: Math.max(0, Math.round(Number(v.departureMins))),
    }))
    .filter((a) => Number.isFinite(a.minutes))
    .sort((a, b) => a.minutes - b.minutes);
}
