// Geometry helpers: distances for "near me" (in the browser; the location never leaves it)
// and placing stops along a route (on the server).

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;

/** Straight-line (great-circle) distance in metres between two points. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Localized distance: "120 m" (rounded to 10 m) below 1 km, otherwise "1.4 km". */
export function formatDistance(meters: number, lang: string): string {
  const rounded = Math.max(10, Math.round(meters / 10) * 10);
  if (rounded < 1000) {
    return new Intl.NumberFormat(lang, { style: 'unit', unit: 'meter' }).format(rounded);
  }
  return new Intl.NumberFormat(lang, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 1,
  }).format(meters / 1000);
}

/**
 * Where a point lies along a path: the index of the path segment closest to it, plus how far
 * along that segment (0–1). Stops sorted by this value are in the order the bus reaches them.
 */
export function positionAlongPath(point: LatLng, path: LatLng[]): number {
  // Flat projection around the point; accurate enough over a city.
  const kx = Math.cos((point.lat * Math.PI) / 180);
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const ax = (path[i].lng - point.lng) * kx;
    const ay = path[i].lat - point.lat;
    const dx = (path[i + 1].lng - path[i].lng) * kx;
    const dy = path[i + 1].lat - path[i].lat;
    const length = dx * dx + dy * dy;
    const t = length > 0 ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / length)) : 0;
    const distance = (ax + t * dx) ** 2 + (ay + t * dy) ** 2;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i + t;
    }
  }
  return best;
}
