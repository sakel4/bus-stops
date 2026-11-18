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
- **Live arrivals.** See which line is coming, where it's heading and in how many minutes. Arrival times refresh automatically every 30 seconds while the page is open.
- **Favourites.** Tap the star next to a stop in the list, or on its page, to save it. The home page opens on your favourites, and the star in the header takes you back to them from any page. They are saved only in your browser.
- **Near me.** Press the button and allow location access to see the 5 nearest stops with their straight-line distance. The nearest stop may be across the street, serving the opposite direction, which is why more than one is shown.
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
cp .env.example .env   # then set CITYBUS_TOKEN
npm run dev            # http://localhost:4321
```

| Command           | What it does                              |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the dev server                      |
| `npm run build`   | Build for production (Vercel output)      |
| `npx astro check` | Type-check the project                    |

### Environment variables

| Variable        | Required | Purpose                                                                 |
| --------------- | -------- | ----------------------------------------------------------------------- |
| `CITYBUS_TOKEN` | Yes      | Bearer token for rest.citybus.gr. Server-only, never sent to the browser. Without it, stop pages show "Arrivals are unavailable". |
| `SITE_URL`      | No       | Public origin used for absolute URLs (link previews). On Vercel the production domain is used automatically. |

### How it fits together

- All pages (home, 1,070 stop pages, 48 line pages, FAQ, privacy) are prerendered as static HTML.
- The only server code is two endpoints that proxy `rest.citybus.gr` with the token (`src/lib/citybus.ts`). The citybus API only allows browser requests from its own site, so its data has to go through them.
  - `src/pages/api/stops/[code]/live.ts` caches each stop for 20 seconds and returns a small JSON list of arrivals.
  - `src/pages/api/lines/[line].ts` fetches a line and the points of its routes, orders each route's stops along its path, and returns compact JSON. It's cached for an hour.
- Text pages (`faq.md`, `privacy.md`) are Markdown under `src/pages/` and `src/pages/en/`; UI strings live in `src/i18n/ui.ts`.

### Deployment

Deployed on [Vercel](https://vercel.com) with `@astrojs/vercel`. Set `CITYBUS_TOKEN` in the project's environment variables. The API functions run in Frankfurt (`fra1`, see `vercel.json`).

## Support the project

This is a free, ad-free hobby project. If it saves you some waiting at the bus stop and you'd like to say thanks, you can buy me a coffee on Ko-fi. It helps cover hosting and keeps the project going.

[![Support me on Ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/sakel4)
