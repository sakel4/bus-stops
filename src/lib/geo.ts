// Distance helpers for "near me" (run in the browser; the location never leaves it).

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
