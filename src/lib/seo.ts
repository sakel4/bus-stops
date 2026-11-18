// Structured data (schema.org JSON-LD) for search engines, passed to Layout.astro as `jsonLd`.
// Test a built page at https://search.google.com/test/rich-results or https://validator.schema.org.

import type { Lang } from '../i18n/ui';
import { localizePath, useTranslations } from '../i18n/utils';
import { getStopName, getStopUrl, type Stop } from './stops';

type JsonLd = Record<string, unknown>;

/** Absolute URL of a site path (structured data needs absolute URLs). */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return new URL(path, site).href;
}

/** The city every stop is in. */
const HERAKLION: JsonLd = {
  '@type': 'City',
  name: 'Heraklion',
  alternateName: 'Ηράκλειο',
  containedInPlace: { '@type': 'AdministrativeArea', name: 'Crete, Greece' },
};

/** Home page: what the site is, as a website and as an installable web app. */
export function homeJsonLd(lang: Lang, site: URL | undefined): JsonLd[] {
  const t = useTranslations(lang);
  const url = absoluteUrl(localizePath(lang), site);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: t('site.name'),
      alternateName: t('site.title'),
      url,
      inLanguage: lang,
      description: t('site.description'),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: t('site.name'),
      url,
      applicationCategory: 'TravelApplication',
      operatingSystem: 'Any',
      inLanguage: lang,
      description: t('site.description'),
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'EUR' },
      areaServed: HERAKLION,
    },
  ];
}

/** Breadcrumb trail, home first. Each item is [name, localized path]. */
export function breadcrumbJsonLd(
  lang: Lang,
  site: URL | undefined,
  items: [name: string, path: string][],
): JsonLd {
  const t = useTranslations(lang);
  const trail: [string, string][] = [[t('site.name'), localizePath(lang)], ...items];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: absoluteUrl(path, site),
    })),
  };
}

/** A stop as a schema.org BusStop, with its location. */
export function busStopJsonLd(stop: Stop, lang: Lang, site: URL | undefined): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BusStop',
    name: getStopName(stop, lang),
    identifier: stop.code,
    url: absoluteUrl(getStopUrl(stop, lang), site),
    geo: { '@type': 'GeoCoordinates', latitude: stop.latitude, longitude: stop.longitude },
    containedInPlace: HERAKLION,
  };
}

/** Questions and answers of a FAQ page. */
export function faqJsonLd(questions: { question: string; answer: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}
