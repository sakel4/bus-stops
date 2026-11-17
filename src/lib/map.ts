// Leaflet helpers shared by the maps (browser only).

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** A Leaflet map with OpenStreetMap tiles that follows its container's size. */
export function createMap(container: HTMLElement): L.Map {
  const map = L.map(container, { preferCanvas: true });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  // The container may change size (e.g. responsive layout).
  new ResizeObserver(() => map.invalidateSize()).observe(container);
  return map;
}

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Popup for a stop marker: its name, a few lines of details and a link to the stop page. */
export function stopPopupHtml(stop: {
  name: string;
  details: string[];
  url: string;
  linkLabel: string;
}): string {
  return (
    `<strong>${escape(stop.name)}</strong><br>` +
    stop.details.map((line) => `${escape(line)}<br>`).join('') +
    // `!` so Tailwind wins over Leaflet's `.leaflet-container a` color.
    `<a href="${escape(stop.url)}" class="mt-2 inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white! no-underline! transition-colors hover:bg-blue-700">` +
    `${escape(stop.linkLabel)} <span aria-hidden="true">›</span></a>`
  );
}
