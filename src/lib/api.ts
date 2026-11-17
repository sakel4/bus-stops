// Helpers for the API endpoints under src/pages/api/.

import { defaultLang, type Lang } from '../i18n/ui';
import { isLang } from '../i18n/utils';

export const json = (body: unknown, status: number, cacheControl = 'no-store') =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': cacheControl },
  });

/** ?lang=el|en picks the language of the names in the response; defaults to Greek. Null if unsupported. */
export function getLangParam(url: URL): Lang | null {
  const lang = url.searchParams.get('lang') ?? defaultLang;
  return isLang(lang) ? lang : null;
}
