import type { APIRoute } from 'astro';
import { json } from '../../lib/api';
import { ALL_LINES, DAYS, SCHEDULE_LINES, getPdfUrl, type Day, type SchedulesResponse } from '../../lib/schedules';

// Rendered on demand; Vercel's CDN caches the result (see below), so this runs a few times a day.
export const prerender = false;

/**
 * The operator doesn't always delete timetables of lines that ended: in Nov 2026 k87.pdf
 * (Knossos Express) was still online with a September 2024 timetable. Active ones are re-uploaded
 * regularly, though not always yearly (s5.pdf/s6.pdf, still in use, dated from Oct 2025).
 * A PDF not updated for this long is treated as not running.
 */
const MAX_AGE_MS = 18 * 30 * 24 * 60 * 60 * 1000; // ~18 months

/** true = current PDF exists, false = missing or stale, null = couldn't tell (timeout, network error, 5xx). */
async function pdfExists(url: string): Promise<boolean | null> {
  try {
    // HEAD: no PDF bytes are downloaded. Existing files answer 302 -> 200 application/pdf.
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) });
    if (res.status >= 500) return null;
    // Also check the type, in case a missing file ever answers 200 with an HTML page.
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('pdf')) return false;
    const modified = Date.parse(res.headers.get('last-modified') ?? '');
    return Number.isNaN(modified) || Date.now() - modified < MAX_AGE_MS;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async () => {
  const codes = [ALL_LINES, ...SCHEDULE_LINES.map((line) => line.code)];
  const checks = codes.flatMap((line) =>
    DAYS.map(async (day) => ({ line, day, exists: await pdfExists(getPdfUrl(line, day)) })),
  );
  const results = await Promise.all(checks);

  // Nothing answered: their site is down. Don't let the CDN cache "no buses run".
  if (results.every((r) => r.exists === null)) {
    console.error('[schedules] astiko-irakleiou.gr unreachable');
    return json({ error: 'upstream_unavailable' }, 502);
  }

  const lines: Record<string, Day[]> = Object.fromEntries(codes.map((code) => [code, []]));
  for (const r of results) if (r.exists) lines[r.line].push(r.day);

  const body: SchedulesResponse = { checkedAt: new Date().toISOString(), lines };
  // Some checks failed: the answer may be missing days, so cache it briefly and try again soon.
  const partial = results.some((r) => r.exists === null);
  return json(
    body,
    200,
    partial
      ? 'public, max-age=300, s-maxage=600'
      : 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400',
  );
};
