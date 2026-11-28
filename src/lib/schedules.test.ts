// Tests for src/lib/schedules.ts and src/pages/api/schedules.ts (kept here: a test file under
// src/pages/ would become a route).
import type { APIContext } from 'astro';
import { afterEach, expect, test, vi } from 'vitest';
import { GET } from '../pages/api/schedules';
import { getPdfUrl, getToday } from './schedules';

test('the service day follows Athens time, not UTC', () => {
  expect(getToday(new Date('2026-11-27T22:30:00Z'))).toBe('saturday'); // Fri in UTC, Sat 00:30 in Athens
  expect(getToday(new Date('2026-11-28T22:30:00Z'))).toBe('sunday'); // Sat in UTC
  expect(getToday(new Date('2026-11-29T22:30:00Z'))).toBe('weekday'); // Sun in UTC
});

const pdf = (lastModified = new Date().toUTCString()) =>
  new Response(null, { headers: { 'content-type': 'application/pdf', 'last-modified': lastModified } });
const get = () => GET({} as APIContext) as Promise<Response>;

afterEach(() => {
  vi.unstubAllGlobals();
});

test('when their site is down, the answer is a 502 the CDN does not cache', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));

  const res = await get();

  expect(res.status).toBe(502);
  expect(res.headers.get('cache-control')).toBe('no-store');
});

test('a failed check keeps the answer cached only briefly', async () => {
  const failing = getPdfUrl('02', 'weekday');
  vi.stubGlobal('fetch', vi.fn(async (url: string) => (url === failing ? new Response(null, { status: 503 }) : pdf())));

  const res = await get();

  expect(res.status).toBe(200);
  expect(res.headers.get('cache-control')).toBe('public, max-age=300, s-maxage=600');
  expect((await res.json()).lines['02']).toEqual(['saturday', 'sunday']);
});

test('a missing PDF, an HTML page or one older than 18 months means that day does not run', async () => {
  const urls = {
    missing: getPdfUrl('03', 'weekday'),
    html: getPdfUrl('03', 'saturday'),
    stale: getPdfUrl('03', 'sunday'),
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url === urls.missing) return new Response(null, { status: 404 });
      if (url === urls.html) return new Response(null, { headers: { 'content-type': 'text/html' } });
      if (url === urls.stale) return pdf('Mon, 02 Sep 2024 10:00:00 GMT');
      return pdf();
    }),
  );

  const { lines } = await (await get()).json();

  expect(lines['03']).toEqual([]);
  expect(lines['04']).toEqual(['weekday', 'saturday', 'sunday']);
});
