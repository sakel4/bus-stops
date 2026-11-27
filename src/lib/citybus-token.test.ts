import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('astro:env/server', () => ({
  CITYBUS_TOKEN: 'env-token',
  GLOBAL_CONFIG: 'connection',
  VERCEL_API_TOKEN: 'vercel-token',
}));

let stored: string | undefined;
const storeGet = vi.fn(async () => stored);
vi.mock('@vercel/global-config', () => ({
  createClient: () => ({ get: storeGet }),
  parseConnectionString: () => ({ id: 'store-id' }),
}));

const PAGE = 'https://irakleio.citybus.gr/el/stops';
let page: string;
const fetchMock = vi.fn(async (url: string) =>
  url === PAGE ? new Response(page) : new Response('{}'), // the Vercel save
);
const pageFetches = () => fetchMock.mock.calls.filter(([url]) => url === PAGE).length;

beforeEach(() => {
  vi.resetModules(); // fresh module state (cache, failure timer) per test
  vi.stubEnv('DEV', false);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
  storeGet.mockClear();
  stored = 'old';
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

test('a rejected token is replaced once by the one on the citybus page, even for concurrent 401s', async () => {
  const { refreshToken } = await import('./citybus-token');
  page = "const token = 'new';";

  expect(await Promise.all([refreshToken('old'), refreshToken('old')])).toEqual(['new', 'new']);
  expect(pageFetches()).toBe(1);
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.vercel.com/v1/global-config/store-id/items',
    expect.objectContaining({ method: 'PATCH' }),
  );
});

test('a token another instance saved is used without fetching the page', async () => {
  const { refreshToken } = await import('./citybus-token');
  stored = 'saved-by-other';

  expect(await refreshToken('old')).toBe('saved-by-other');
  expect(pageFetches()).toBe(0);
});

test('after a failed refresh, neither the page nor the store is read again for a minute', async () => {
  const { refreshToken } = await import('./citybus-token');
  page = '<html>changed</html>';

  expect(await refreshToken('old')).toBeUndefined();
  expect(await refreshToken('old')).toBeUndefined();
  expect(pageFetches()).toBe(1);
  expect(storeGet).toHaveBeenCalledTimes(1);
});
