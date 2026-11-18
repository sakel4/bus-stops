import type { APIRoute } from 'astro';
import { getLangParam, json } from '../../../../lib/api';
import { getLineVehicles } from '../../../../lib/citybus';
import { getLineCodes, type LineLiveResponse } from '../../../../lib/line-routes';

// Rendered on demand: this route needs a server.
export const prerender = false;

// Only proxy known lines, so this can't be used to call arbitrary citybus URLs.
const lineCodes = new Set(getLineCodes());

export const GET: APIRoute = async ({ params, url }) => {
  const line = params.line;
  if (!line || !lineCodes.has(line)) return json({ error: 'not_found' }, 404);

  const lang = getLangParam(url);
  if (!lang) return json({ error: 'unsupported_lang' }, 400);

  try {
    const { vehicles, fetchedAt } = await getLineVehicles(line, lang);
    const body: LineLiveResponse = { vehicles, updatedAt: new Date(fetchedAt).toISOString() };
    return json(body, 200, 'public, max-age=15');
  } catch (err) {
    console.error(`[line live] ${line} (${lang}):`, err);
    return json({ error: 'upstream_unavailable' }, 502);
  }
};
