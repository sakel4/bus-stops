import type { APIRoute } from 'astro';
import { defaultLang } from '../../../i18n/ui';
import { isLang } from '../../../i18n/utils';
import { getLineDetails } from '../../../lib/citybus';
import { getLineCodes } from '../../../lib/line-routes';

// Rendered on demand, like the live arrivals endpoint.
export const prerender = false;

// Only proxy known lines, so this can't be used to call arbitrary citybus URLs.
const lineCodes = new Set(getLineCodes());

const json = (body: unknown, status: number, cacheControl = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl },
  });

export const GET: APIRoute = async ({ params, url }) => {
  const line = params.line;
  if (!line || !lineCodes.has(line)) return json({ error: 'not_found' }, 404);

  // ?lang=el|en picks the language of route and stop names; defaults to Greek.
  const langParam = url.searchParams.get('lang') ?? defaultLang;
  if (!isLang(langParam)) return json({ error: 'unsupported_lang' }, 400);

  try {
    // Routes rarely change: let browsers and Vercel's CDN keep them for an hour.
    return json(await getLineDetails(line, langParam), 200, 'public, max-age=3600, s-maxage=3600');
  } catch (err) {
    console.error(`[line] ${line} (${langParam}):`, err);
    return json({ error: 'upstream_unavailable' }, 502);
  }
};
