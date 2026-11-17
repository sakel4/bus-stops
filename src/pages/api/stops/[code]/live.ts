import type { APIRoute } from 'astro';
import { defaultLang } from '../../../../i18n/ui';
import { isLang } from '../../../../i18n/utils';
import type { LiveArrivalsResponse } from '../../../../lib/arrivals';
import { getLiveArrivals } from '../../../../lib/citybus';
import { getStops } from '../../../../lib/stops';

// Rendered on demand: this is the only route that needs a server.
export const prerender = false;

// Only proxy known stops, so this can't be used to call arbitrary citybus URLs.
// Every language's data file has the same stop codes.
const stopCodes = new Set(getStops('el').map((stop) => stop.code));

const json = (body: unknown, status: number, cacheControl = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl },
  });

export const GET: APIRoute = async ({ params, url }) => {
  const code = params.code;
  if (!code || !stopCodes.has(code)) return json({ error: 'not_found' }, 404);

  // ?lang=el|en picks the language of destination names; defaults to Greek.
  const langParam = url.searchParams.get('lang') ?? defaultLang;
  if (!isLang(langParam)) return json({ error: 'unsupported_lang' }, 400);

  try {
    const { arrivals, fetchedAt } = await getLiveArrivals(code, langParam);
    const body: LiveArrivalsResponse = { arrivals, updatedAt: new Date(fetchedAt).toISOString() };
    return json(body, 200, 'public, max-age=15');
  } catch (err) {
    console.error(`[live arrivals] stop ${code} (${langParam}):`, err);
    return json({ error: 'upstream_unavailable' }, 502);
  }
};
