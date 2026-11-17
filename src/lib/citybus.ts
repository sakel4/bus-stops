// Server-only client for the citybus REST API. Never import this from browser code.

import { CITYBUS_TOKEN } from 'astro:env/server';
import type { Lang } from '../i18n/ui';
import type { Arrival } from './arrivals';
import { positionAlongPath } from './geo';
import type { LineDetailsResponse, LineRoute } from './line-routes';
import { getStopName, getStops } from './stops';

const API_URL = 'https://rest.citybus.gr/api/v1';
// Heraklion's id in the citybus API.
const CITY_ID = 110;
const LIVE_CACHE_MS = 20_000;
// Lines and their routes rarely change.
const LINE_CACHE_MS = 60 * 60_000;
const TIMEOUT_MS = 8_000;

interface LiveArrivals {
  arrivals: Arrival[];
  fetchedAt: number;
}

// One entry per request; concurrent requests for it share one upstream call.
const cache = new Map<string, { at: number; data: Promise<unknown> }>();

function cached<T>(key: string, maxAgeMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < maxAgeMs) return hit.data as Promise<T>;

  const entry = { at: Date.now(), data: load() };
  cache.set(key, entry);
  // Don't keep failures around; the next request should try again.
  entry.data.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return entry.data;
}

async function request(path: string, lang: Lang): Promise<unknown> {
  if (!CITYBUS_TOKEN) throw new Error('CITYBUS_TOKEN is not set');

  const res = await fetch(`${API_URL}/${lang}/${CITY_ID}/${path}`, {
    headers: { Authorization: `Bearer ${CITYBUS_TOKEN}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 401) {
    throw new Error('citybus rejected the token (401); CITYBUS_TOKEN may have changed');
  }
  if (!res.ok) throw new Error(`citybus responded with ${res.status}`);
  return res.json();
}

const unexpected = (raw: unknown) =>
  new Error(`Unexpected citybus response: ${JSON.stringify(raw).slice(0, 300)}`);

export function getLiveArrivals(code: string, lang: Lang): Promise<LiveArrivals> {
  return cached(`live:${lang}:${code}`, LIVE_CACHE_MS, async () => ({
    arrivals: parseArrivals(await request(`stops/live/${encodeURIComponent(code)}`, lang)),
    fetchedAt: Date.now(),
  }));
}

interface UpstreamLiveResponse {
  vehicles: {
    lineCode: string;
    routeName: string;
    departureMins: number;
  }[];
}

function parseArrivals(raw: unknown): Arrival[] {
  const vehicles = (raw as Partial<UpstreamLiveResponse> | null)?.vehicles;
  if (!Array.isArray(vehicles)) throw unexpected(raw);

  return vehicles
    .map((v) => ({
      line: String(v.lineCode),
      destination: String(v.routeName ?? ''),
      minutes: Math.max(0, Math.round(Number(v.departureMins))),
    }))
    .filter((a) => Number.isFinite(a.minutes))
    .sort((a, b) => a.minutes - b.minutes);
}

/** A line with each of its routes: the road it takes and its stops in order. */
export function getLineDetails(line: string, lang: Lang): Promise<LineDetailsResponse> {
  return cached(`line:${lang}:${line}`, LINE_CACHE_MS, async () => {
    const path = `lines/${encodeURIComponent(line)}`;
    const [info, points] = await Promise.all([request(path, lang), request(`${path}/points`, lang)]);
    return parseLine(info, points, lang);
  });
}

interface UpstreamLine {
  code: string;
  name: string;
  routes: { code: string; name: string }[];
}

type UpstreamLinePoints = {
  routeCode: string;
  routePoints: { sequence: number; latitude: string; longitude: string }[];
}[];

// Route names come with stray spaces and trailing dashes, e.g. 'ΓΙΟΦΥΡΟ - ΑΕΡΟΔΡΟΜΙΟ -'.
const cleanName = (name: unknown) =>
  String(name ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[\s.-]+$/, '')
    .trim();

// About 1 m; keeps the response small.
const round = (n: number) => Math.round(n * 1e5) / 1e5;

function parseLine(rawInfo: unknown, rawPoints: unknown, lang: Lang): LineDetailsResponse {
  const info = rawInfo as Partial<UpstreamLine> | null;
  if (!info || !Array.isArray(info.routes)) throw unexpected(rawInfo);
  if (!Array.isArray(rawPoints)) throw unexpected(rawPoints);

  const paths = new Map(
    (rawPoints as UpstreamLinePoints).map((route) => [
      String(route.routeCode),
      [...(route.routePoints ?? [])]
        .sort((a, b) => a.sequence - b.sequence)
        .map((p): [number, number] => [round(Number(p.latitude)), round(Number(p.longitude))])
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)),
    ]),
  );
  const stops = getStops(lang);

  const routes = info.routes.flatMap((route): LineRoute[] => {
    const code = String(route.code);
    const path = paths.get(code) ?? [];
    // Without a path, the order of the stops is unknown.
    if (path.length < 2) return [];

    // citybus doesn't list a route's stops; our stop data says which routes serve each stop.
    const pathPoints = path.map(([lat, lng]) => ({ lat, lng }));
    const routeStops = stops
      .filter((stop) => stop.routeCodes.includes(code))
      .map((stop) => ({
        stop,
        position: positionAlongPath({ lat: stop.latitude, lng: stop.longitude }, pathPoints),
      }))
      .sort((a, b) => a.position - b.position)
      .map(({ stop }) => ({
        code: stop.code,
        name: getStopName(stop, lang),
        latitude: stop.latitude,
        longitude: stop.longitude,
      }));
    if (routeStops.length === 0) return [];

    return [{ code, name: cleanName(route.name), path, stops: routeStops }];
  });

  return { code: String(info.code ?? ''), name: cleanName(info.name), routes };
}
