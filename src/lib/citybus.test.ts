import { beforeEach, expect, test, vi } from 'vitest';
import { upstreamError } from './api';
import { getLineDetails, getLiveArrivals } from './citybus';
import { getToken, refreshToken } from './citybus-token';
import { getStops } from './stops';

vi.mock('./citybus-token', () => ({
  getToken: vi.fn(async () => 'old'),
  refreshToken: vi.fn(async () => 'new'),
}));

const fetchMock = vi.fn<typeof fetch>();
vi.stubGlobal('fetch', fetchMock);

const reply = (status: number, body: unknown = {}) => new Response(JSON.stringify(body), { status });
const tokensSent = () =>
  fetchMock.mock.calls.map(([, init]) => (init?.headers as Record<string, string>).Authorization);
// Each test uses its own stop code: getLiveArrivals caches successful answers for 20 s.
let stop = 0;
const nextStop = () => String(++stop);

beforeEach(() => {
  fetchMock.mockReset();
  vi.mocked(refreshToken).mockResolvedValue('new');
});

test('a 401 gets a new token and retries once', async () => {
  fetchMock.mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(
    reply(200, { vehicles: [{ lineCode: '02', routeName: 'A', departureMins: 3, latitude: '', longitude: '' }] }),
  );

  const { arrivals } = await getLiveArrivals(nextStop(), 'en');

  expect(arrivals).toEqual([{ line: '02', destination: 'A', minutes: 3, position: null }]);
  expect(refreshToken).toHaveBeenCalledWith('old');
  expect(tokensSent()).toEqual(['Bearer old', 'Bearer new']);
});

test('a second 401 becomes a 503 service_issue, without a third try', async () => {
  fetchMock.mockResolvedValue(reply(401));

  const err = await getLiveArrivals(nextStop(), 'en').catch((e: unknown) => e);

  expect(fetchMock).toHaveBeenCalledTimes(2);
  const res = upstreamError(err);
  expect(res.status).toBe(503);
  expect(await res.json()).toEqual({ error: 'service_issue' });
});

test('no new token after a 401 is a service issue too', async () => {
  fetchMock.mockResolvedValue(reply(401));
  vi.mocked(refreshToken).mockResolvedValue(undefined);

  const err = await getLiveArrivals(nextStop(), 'en').catch((e: unknown) => e);

  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(upstreamError(err).status).toBe(503);
});

test('a 404 means no buses right now, not an error', async () => {
  fetchMock.mockResolvedValue(reply(404));

  expect((await getLiveArrivals(nextStop(), 'en')).arrivals).toEqual([]);
  expect(getToken).toHaveBeenCalled();
});

test('other upstream errors are a 502', async () => {
  fetchMock.mockResolvedValue(reply(500));

  const err = await getLiveArrivals(nextStop(), 'en').catch((e: unknown) => e);

  expect(upstreamError(err).status).toBe(502);
});

// Line details: citybus gives routes and their paths; our stop data says which stops each route serves.
const lineReplies = (line: string, points: unknown) => (url: string | URL | Request) =>
  Promise.resolve(
    String(url).endsWith(`/lines/${line}/points`)
      ? reply(200, points)
      : reply(200, {
          code: line,
          name: ' LINE ',
          routes: [
            { code: '1027', name: 'A  -  B -' },
            { code: '9999', name: 'no path' },
          ],
        }),
  );

test('a line keeps the routes that have a path, with the stops our data gives them', async () => {
  fetchMock.mockImplementation(
    lineReplies('06', [
      { routeCode: '1027', routePoints: [
        { sequence: 2, latitude: '35.34', longitude: '25.13' },
        { sequence: 1, latitude: '35.33', longitude: '25.10' },
      ] },
      { routeCode: '9999', routePoints: [{ sequence: 1, latitude: '35.33', longitude: '25.10' }] },
    ]),
  );

  const { name, routes } = await getLineDetails('06', 'en');

  expect(name).toBe('LINE');
  expect(routes.map((r) => [r.code, r.name])).toEqual([['1027', 'A - B']]);
  expect(routes[0].path[0]).toEqual([35.33, 25.1]); // sorted by sequence
  const expected = getStops('en').filter((stop) => stop.routeCodes.includes('1027'));
  expect(routes[0].stops.map((s) => s.code).sort()).toEqual(expected.map((s) => s.code).sort());
});

test('a line with no usable routes is an error, so it is not cached', async () => {
  fetchMock.mockImplementation(lineReplies('10', []));

  await expect(getLineDetails('10', 'en')).rejects.toThrow('Unexpected citybus response');
});
