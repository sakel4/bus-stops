// Landing pages for the places people most often search a bus to ("bus to Heraklion airport",
// "λεωφορείο για Κνωσό"): src/pages/[en/]destinations/. The lines on each page come from the stop
// data, so they stay current; only the stops per destination are chosen here.

import type { Lang } from '../i18n/ui';
import { localizePath } from '../i18n/utils';
import { distanceMeters } from './geo';
import { getStops, type Stop } from './stops';

export interface Destination {
  /** URL segment: /destinations/{slug}/ */
  slug: string;
  name: Record<Lang, string>;
  /** "to …" phrase used in titles: "Bus to Heraklion Airport", "Λεωφορείο για το Αεροδρόμιο". */
  to: Record<Lang, string>;
  /** One factual sentence about the place. */
  about: Record<Lang, string>;
  /** Codes of the stops serving the place, the main one first. */
  stopCodes: string[];
}

export const DESTINATIONS: Destination[] = [
  {
    slug: 'airport',
    name: { el: 'Αεροδρόμιο Ηρακλείου', en: 'Heraklion Airport' },
    to: { el: 'για το Αεροδρόμιο Ηρακλείου', en: 'to Heraklion Airport' },
    about: {
      el: 'Το Διεθνές Αεροδρόμιο Ηρακλείου «Νίκος Καζαντζάκης» (HER), ανατολικά του κέντρου της πόλης.',
      en: 'Heraklion International Airport “Nikos Kazantzakis” (HER), east of the city centre.',
    },
    stopCodes: ['9911', '9311'],
  },
  {
    slug: 'knossos',
    name: { el: 'Κνωσός', en: 'Knossos' },
    to: { el: 'για την Κνωσό', en: 'to Knossos' },
    about: {
      el: 'Ο αρχαιολογικός χώρος του Μινωικού Ανακτόρου της Κνωσού, νοτιοανατολικά του κέντρου.',
      en: 'The archaeological site of the Minoan Palace of Knossos, south-east of the city centre.',
    },
    stopCodes: ['1216', '0024'],
  },
  {
    slug: 'port',
    name: { el: 'Λιμάνι Ηρακλείου', en: 'Heraklion Port' },
    to: { el: 'για το Λιμάνι Ηρακλείου', en: 'to Heraklion Port' },
    about: {
      el: 'Το λιμάνι του Ηρακλείου, για τα πλοία και τα κρουαζιερόπλοια.',
      en: 'The port of Heraklion, for ferries and cruise ships.',
    },
    stopCodes: ['0022'],
  },
  {
    slug: 'intercity-bus-station',
    name: { el: 'Σταθμός Υπεραστικών ΚΤΕΛ', en: 'Intercity Bus Station (KTEL)' },
    to: { el: 'για τον Σταθμό Υπεραστικών ΚΤΕΛ', en: 'to the Intercity Bus Station (KTEL)' },
    about: {
      el: 'Ο σταθμός των υπεραστικών λεωφορείων ΚΤΕΛ, για τις άλλες πόλεις της Κρήτης, δίπλα στο λιμάνι.',
      en: 'The KTEL intercity bus station, for buses to the rest of Crete, next to the port.',
    },
    stopCodes: ['2203', '0022'],
  },
  {
    slug: 'pagni-hospital',
    name: { el: 'ΠΑΓΝΗ', en: 'PAGNI Hospital' },
    to: { el: 'για το ΠΑΓΝΗ', en: 'to PAGNI Hospital' },
    about: {
      el: 'Το Πανεπιστημιακό Γενικό Νοσοκομείο Ηρακλείου (ΠΑΓΝΗ), στις Βούτες.',
      en: 'The University General Hospital of Heraklion (PAGNI), at Voutes.',
    },
    stopCodes: ['2018'],
  },
  {
    slug: 'university-of-crete',
    name: { el: 'Πανεπιστήμιο Κρήτης', en: 'University of Crete' },
    to: { el: 'για το Πανεπιστήμιο Κρήτης', en: 'to the University of Crete' },
    about: {
      el: 'Η πανεπιστημιούπολη του Πανεπιστημίου Κρήτης στις Βούτες, δίπλα στο ΠΑΓΝΗ.',
      en: 'The University of Crete campus at Voutes, next to PAGNI hospital.',
    },
    stopCodes: ['0207'],
  },
  {
    slug: 'hellenic-mediterranean-university',
    name: { el: 'ΕΛΜΕΠΑ', en: 'Hellenic Mediterranean University' },
    to: { el: 'για το ΕΛΜΕΠΑ', en: 'to the Hellenic Mediterranean University' },
    about: {
      el: 'Η πανεπιστημιούπολη του Ελληνικού Μεσογειακού Πανεπιστημίου (ΕΛΜΕΠΑ) στον Εσταυρωμένο.',
      en: 'The Hellenic Mediterranean University (HMU) campus at Estavromenos.',
    },
    stopCodes: ['1108', '1104'],
  },
  {
    slug: 'ammoudara',
    name: { el: 'Αμμουδάρα', en: 'Ammoudara' },
    to: { el: 'για την Αμμουδάρα', en: 'to Ammoudara' },
    about: {
      el: 'Η παραλία της Αμμουδάρας, δυτικά της πόλης.',
      en: 'Ammoudara beach, west of the city.',
    },
    stopCodes: ['0015'],
  },
];

/** Lions Square (Morosini Fountain), the usual "city centre" reference point. */
const CITY_CENTRE = { lat: 35.33918, lng: 25.13342 };

/** Other stops within this distance of a destination's stops are listed as nearby. */
const NEARBY_METERS = 300;

const toLatLng = (stop: Stop) => ({ lat: stop.latitude, lng: stop.longitude });

/** Path without locale prefix: 'destinations' or 'destinations/airport'. */
export function getDestinationPath(slug?: string): string {
  return slug ? `destinations/${slug}` : 'destinations';
}

export function getDestinationUrl(slug: string, lang: Lang): string {
  return localizePath(lang, getDestinationPath(slug));
}

export interface DestinationDetails {
  stops: Stop[];
  /** Other stops close by, nearest first, with their distance from the closest main stop. */
  nearby: { stop: Stop; meters: number }[];
  /** Every line serving the main stops, sorted. */
  lineCodes: string[];
  /** Straight-line distance from the main stop to the city centre. */
  centreMeters: number;
}

export function getDestinationDetails(destination: Destination, lang: Lang): DestinationDetails {
  const all = getStops(lang);
  const byCode = new Map(all.map((stop) => [stop.code, stop]));
  const stops = destination.stopCodes.map((code) => {
    const stop = byCode.get(code);
    if (!stop) throw new Error(`Destination ${destination.slug}: unknown stop ${code}`);
    return stop;
  });
  const nearby = all
    .filter((stop) => !destination.stopCodes.includes(stop.code))
    .map((stop) => ({
      stop,
      meters: Math.min(...stops.map((main) => distanceMeters(toLatLng(main), toLatLng(stop)))),
    }))
    .filter(({ meters }) => meters <= NEARBY_METERS)
    .sort((a, b) => a.meters - b.meters);
  const lineCodes = [...new Set(stops.flatMap((stop) => stop.lineCodes))].sort();
  return {
    stops,
    nearby,
    lineCodes,
    centreMeters: distanceMeters(toLatLng(stops[0]), CITY_CENTRE),
  };
}

/** Destinations whose main stops include this stop (for a link back from the stop page). */
export function getDestinationsForStop(code: string): Destination[] {
  return DESTINATIONS.filter((destination) => destination.stopCodes.includes(code));
}
