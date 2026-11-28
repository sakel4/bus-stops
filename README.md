![HopOn, Heraklion Bus Stops: live bus arrivals](public/og-image.jpg)

# HopOn

**Heraklion Bus Stops · Στάσεις Λεωφορείων Ηρακλείου**

A map and a list of every city bus stop in Heraklion, Crete, with live arrival times for each stop and the route of every bus line. Available in Greek and English.

It's a hobby project, built to solve an everyday problem: quickly checking on your phone when the next bus will reach your stop. It's free, has no ads and doesn't track its visitors.

> **Unofficial.** This project has no association with [Astiko KTEL Irakleiou](https://astiko-irakleiou.gr/) (Αστικό ΚΤΕΛ Ηρακλείου), Heraklion's city bus operator, and does not represent it. For official information, timetables, tickets and announcements, please visit their website.

## Features

- **Map and list of all stops.** Search for a stop by name (Greek or Latin spelling) or by its code.
- **Stop pages.** Every stop has its own page (`/stops/{code}/`, `/en/stops/{code}/`) with the lines serving it, a map and live arrivals.
- **Line pages.** Tap a line on a stop page to see its route on the map and all of its stops in order, with your stop highlighted (`/lines/{line}/`, `/en/lines/{line}/`). Lines with several routes have a route picker.
- **Destination pages.** The lines and stops for popular places such as the airport, Knossos, the port and PAGNI hospital (`/destinations/{slug}/`, `/en/destinations/{slug}/`). The places are listed in `src/lib/destinations.ts`; their lines come from the stop data.
- **Live arrivals.** See which line is coming, where it's heading and in how many minutes. Arrival times refresh automatically every 30 seconds while the page is open.
- **Favourites.** Tap the star next to a stop in the list, or on its page, to save it. The home page opens on your favourites, and the star in the header takes you back to them from any page. They are saved only in your browser.
- **Near me.** Press the button and allow location access to see the 5 nearest stops with their straight-line distance. The nearest stop may be across the street, serving the opposite direction, which is why more than one is shown.
- **Installable app (PWA).** Add it to the home screen to open it full screen. The app's files and recently visited pages are saved on the device, so it opens fast and works with a weak or no connection (arrivals still need one).
- **Greek and English** throughout, including stop names and arrival destinations.

## Where the data comes from

The list of stops and the lines serving them is stored in the app (`src/data/stops_el.json`, `src/data/stops_en.json`). Arrival times come in real time from the public citybus data service (rest.citybus.gr), and so do the line names and the path of each route. citybus doesn't list a route's stops, so the app places the stops that serve a route along its path to get their order.

Arrival times are estimates. Traffic delays or timetable changes may not show up immediately, and the app's data may not always be up to date. The official source for stops, lines and timetables is always the [Astiko KTEL Irakleiou](https://astiko-irakleiou.gr/) website.

## Privacy

No cookies and no ads. Traffic is measured with cookieless, aggregated Vercel Web Analytics. Your location is only used when you press "Near me", is processed only in your browser and is never sent or stored. Favourite stops are kept in your browser's local storage and never leave your device. Requests to citybus contain only the stop or line code and language. See the full privacy policy at `/privacy/` (Greek) or `/en/privacy/` (English).

## Development

Built with [Astro](https://astro.build), [Tailwind CSS](https://tailwindcss.com) and [Leaflet](https://leafletjs.com) with OpenStreetMap tiles. Requires Node.js 24 or newer.

```sh
npm install
cp .env.example .env   # then set CITYBUS_TOKEN (required locally)
npm run dev            # http://localhost:4321
npm test               # unit tests (vitest)
```

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the dev server                      |
| `npm run build`   | Build for production (Vercel output)      |
| `npx astro check` | Type-check the project                    |

### Environment variables

| Variable        | Required | Purpose                                                                 |
| --------------- | -------- | ----------------------------------------------------------------------- |
| `CITYBUS_TOKEN` | No       | Bearer token for rest.citybus.gr. Server-only, never sent to the browser. Fallback only: the current token lives in Global Config and is refreshed automatically (see below). |
| `GLOBAL_CONFIG` | Production | Vercel Global Config connection string, added when the store is connected to the project. Holds the citybus token under `citybusToken`. |
| `VERCEL_API_TOKEN` | Production | Vercel access token that can write the Global Config store, so a refreshed token is shared by every function instance. |
| `SITE_URL`      | No       | Public origin used for absolute URLs (link previews, canonical links, sitemap, robots.txt). On Vercel the production domain is used automatically. |

### How it fits together

- All pages (home, 1,070 stop pages, 48 line pages, destination pages, timetables, FAQ, privacy) are prerendered as static HTML.
- The only server code is two endpoints that proxy `rest.citybus.gr` with the token (`src/lib/citybus.ts`). The citybus API only allows browser requests from its own site, so its data has to go through them.
  - `src/pages/api/stops/[code]/live.ts` caches each stop for 20 seconds and returns a small JSON list of arrivals.
  - `src/pages/api/lines/[line].ts` fetches a line and the points of its routes, orders each route's stops along its path, and returns compact JSON. It's cached for an hour.
- The citybus token (`src/lib/citybus-token.ts`) is read from Global Config (cached for a minute in each function), falling back to `CITYBUS_TOKEN`. When citybus answers 401, the server takes the new token from `https://irakleio.citybus.gr/el/stops` (the token citybus gives its own site), saves it to Global Config and retries once. If that fails too, the endpoints answer `503 {"error":"service_issue"}` and pages show a banner (`ServiceNotice.astro`). In local development (`npm run dev`) only `CITYBUS_TOKEN` from `.env` is used: no Global Config and no refresh.
- SEO: `@astrojs/sitemap` writes `sitemap-index.xml` (with each page's other-language version), `src/pages/robots.txt.ts` links to it, `Layout.astro` adds canonical and hreflang links, and `src/lib/seo.ts` builds the schema.org JSON-LD (website, bus stops, breadcrumbs, FAQ).
- Text pages (`faq.md`, `privacy.md`) are Markdown under `src/pages/` and `src/pages/en/`; UI strings live in `src/i18n/ui.ts`.

### Service worker (PWA)

`public/sw.js` is a small hand-written service worker, registered from `src/layouts/Layout.astro` in production builds only:

| Request | Strategy | Why |
| --- | --- | --- |
| `/_astro/*`, images | Cache first | Hashed file names change on every build, so a saved copy never goes stale |
| Pages | Network first, saved copy after 4 s or offline | Always fresh online; opens on a weak signal; keeps the 30 most recent pages |
| `/api/*`, other sites | Not handled | Live arrivals must never be stale; OpenStreetMap discourages storing tiles |

When offline with no saved copy, it shows `/offline/` (or `/en/offline/`), saved when the service worker installs. `vercel.json` serves `sw.js` with `Cache-Control: no-cache`, so a new version reaches users on their next visit; bump `VERSION` in it to reset every cache.

The manifests are `public/manifest.webmanifest` (Greek) and `public/en/manifest.webmanifest` (English). Both use the same `id`, so they install as one app that opens in the language it was installed from.

**Removing it:** if a release ever misbehaves, replace `public/sw.js` with the following and deploy. Each browser deletes the caches and drops the service worker on its next visit.

```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll()) client.navigate(client.url);
  })());
});
```

### Deployment

Deployed on [Vercel](https://vercel.com) with `@astrojs/vercel`. Connect a Global Config store to the project (this sets `GLOBAL_CONFIG`) and set `VERCEL_API_TOKEN` in the project's environment variables. The API functions run in Frankfurt (`fra1`, see `vercel.json`).

## Support the project

This is a free, ad-free hobby project. If it saves you some waiting at the bus stop and you'd like to say thanks, you can buy me a coffee on Ko-fi. It helps cover hosting and keeps the project going.

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/sakel4)

## License

Copyright (C) 2026 Sakellaris Sfakiotakis

Licensed under the [GNU Affero General Public License v3.0](LICENSE).
