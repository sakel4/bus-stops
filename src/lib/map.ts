// Leaflet helpers shared by the maps (browser only).

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/** Touch screens, where fingers need bigger targets and one-finger drags should scroll the page. */
export const isTouch = () => window.matchMedia('(pointer: coarse)').matches;

/** Devices with a mouse, where hover tooltips make sense. */
export const canHover = () => window.matchMedia('(hover: hover)').matches;

interface MapOptions {
  /**
   * The map sits inside a scrolling page. One finger (touch) and the mouse wheel then scroll
   * the page instead of moving the map; two fingers, or a click first, move the map.
   */
  embedded?: { touchHint: string };
}

/** A Leaflet map with (muted) OpenStreetMap tiles that follows its container's size. */
export function createMap(container: HTMLElement, { embedded }: MapOptions = {}): L.Map {
  const map = L.map(container, {
    // Canvas markers, with a wider hit area for fingers.
    renderer: L.canvas({ tolerance: isTouch() ? 8 : 2 }),
    scrollWheelZoom: !embedded,
  });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    // Toned down in global.css so stops, routes and buses stand out.
    className: 'map-tiles',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  // The container may change size (e.g. responsive layout).
  new ResizeObserver(() => map.invalidateSize()).observe(container);

  if (embedded) {
    // Mouse wheel: only zoom once the user has clicked into the map.
    map.on('click focus', () => map.scrollWheelZoom.enable());
    map.on('mouseout blur', () => map.scrollWheelZoom.disable());

    if (isTouch()) useTwoFingerDrag(map, container, embedded.touchHint);
  }
  return map;
}

/** One finger scrolls the page (with a hint), two fingers move and pinch-zoom the map. */
function useTwoFingerDrag(map: L.Map, container: HTMLElement, hintText: string) {
  map.dragging.disable();
  const hint = L.DomUtil.create('div', 'map-hint', container);
  hint.textContent = hintText;
  hint.setAttribute('aria-hidden', 'true');
  let hideTimer: number | undefined;

  const onTouch = (event: TouchEvent) => {
    if (event.touches.length >= 2) {
      map.dragging.enable();
      hint.classList.remove('is-visible');
    } else {
      map.dragging.disable();
    }
  };
  container.addEventListener('touchstart', onTouch, { passive: true });
  container.addEventListener('touchend', onTouch, { passive: true });
  container.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length !== 1) return;
      hint.classList.add('is-visible');
      clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => hint.classList.remove('is-visible'), 1200);
    },
    { passive: true },
  );
}

/** The blue stop dot used by the stop and home maps. */
export const STOP_STYLE = { color: '#1d4ed8', fillColor: '#3b82f6', fillOpacity: 0.85 };

/** Below this radius the dot is too small to show the arrow (city-wide zoom levels). */
const MIN_ARROW_RADIUS = 6;

// shortcut: draws through Leaflet 1.9's canvas internals (_renderer._ctx, _point, _radius);
// re-check when upgrading Leaflet (2.0 has a Marker `rotation` option).
const StopMarker = L.CircleMarker.extend({
  // Leaflet's internals are untyped.
  _updatePath(this: any) {
    (L.CircleMarker.prototype as any)._updatePath.call(this);
    const bearing: number | null | undefined = this.options.bearing;
    const ctx: CanvasRenderingContext2D | undefined = this._renderer?._ctx;
    const r: number = this._radius;
    if (bearing == null || !ctx || this._empty() || r < MIN_ARROW_RADIUS) return;

    // A white triangle inside the dot, pointing the way the bus leaves the stop.
    ctx.save();
    ctx.translate(this._point.x, this._point.y);
    ctx.rotate((bearing * Math.PI) / 180);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.65);
    ctx.lineTo(r * 0.5, r * 0.4);
    ctx.lineTo(0, r * 0.15);
    ctx.lineTo(-r * 0.5, r * 0.4);
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  },
}) as unknown as new (
  latlng: L.LatLngExpression,
  options: L.CircleMarkerOptions & { bearing: number | null },
) => L.CircleMarker;

/** A stop dot that, zoomed in, shows an arrow for the direction buses travel from it. */
export function stopMarker(
  latlng: L.LatLngExpression,
  options: L.CircleMarkerOptions & { bearing: number | null },
): L.CircleMarker {
  return new StopMarker(latlng, options);
}

export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

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

// Material Symbols "directions_bus" (Apache 2.0): reads well at small sizes.
const BUS_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z"/></svg>';

/**
 * A live bus: a callout in the line's color with a bus icon and the line number, whose tail
 * points at the bus's position.
 */
export function busMarker(
  bus: { line: string; color: string; position: [number, number]; label: string },
  { faded = false } = {},
): L.Marker {
  return L.marker(bus.position, {
    icon: L.divIcon({
      // No class: Leaflet's default one draws a white box behind the icon.
      className: '',
      // A zero-size anchor at the bus's position; the callout is drawn above it (global.css).
      html:
        `<span class="bus-marker${faded ? ' is-faded' : ''}" style="--line-color:${escape(bus.color)}">` +
        `<span class="bus-marker-icon">${BUS_ICON}</span>${escape(bus.line)}</span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }),
    keyboard: false,
    // Above stop markers and the route line.
    zIndexOffset: faded ? 500 : 1000,
  }).bindTooltip(escape(bus.label), { direction: 'top', offset: [0, -32] });
}
