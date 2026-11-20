import type { APIRoute } from 'astro';
import { getLangParam, json, upstreamError } from '../../../lib/api';
import { getLineDetails } from '../../../lib/citybus';
import { getLineCodes } from '../../../lib/line-routes';

// Rendered on demand, like the live arrivals endpoint.
export const prerender = false;

// Only proxy known lines, so this can't be used to call arbitrary citybus URLs.
const lineCodes = new Set(getLineCodes());

export const GET: APIRoute = async ({ params, url }) => {
  const line = params.line;
  if (!line || !lineCodes.has(line)) return json({ error: 'not_found' }, 404);

  const lang = getLangParam(url);
  if (!lang) return json({ error: 'unsupported_lang' }, 400);

  try {
    // Routes rarely change: let browsers and Vercel's CDN keep them for an hour.
    return json(await getLineDetails(line, lang), 200, 'public, max-age=3600, s-maxage=3600');
  } catch (err) {
    console.error(`[line] ${line} (${lang}):`, err);
    return upstreamError(err);
  }
};
