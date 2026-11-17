import type { APIRoute } from 'astro';
import { getLangParam, json } from '../../../../lib/api';
import type { LiveArrivalsResponse } from '../../../../lib/arrivals';
import { getLiveArrivals } from '../../../../lib/citybus';
import { getStops } from '../../../../lib/stops';

// Rendered on demand: this route needs a server.
export const prerender = false;

// Only proxy known stops, so this can't be used to call arbitrary citybus URLs.
// Every language's data file has the same stop codes.
const stopCodes = new Set(getStops('el').map((stop) => stop.code));

export const GET: APIRoute = async ({ params, url }) => {
  const code = params.code;
  if (!code || !stopCodes.has(code)) return json({ error: 'not_found' }, 404);

  const lang = getLangParam(url);
  if (!lang) return json({ error: 'unsupported_lang' }, 400);

  try {
    const { arrivals, fetchedAt } = await getLiveArrivals(code, lang);
    const body: LiveArrivalsResponse = { arrivals, updatedAt: new Date(fetchedAt).toISOString() };
    return json(body, 200, 'public, max-age=15');
  } catch (err) {
    console.error(`[live arrivals] stop ${code} (${lang}):`, err);
    return json({ error: 'upstream_unavailable' }, 502);
  }
};
