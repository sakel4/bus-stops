import type { APIRoute } from 'astro';

// Generated (not in public/) so the Sitemap line always has the site's real origin (astro.config.mjs `site`).
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site).href;
  const body = `# HopOn – Heraklion Bus Stops
# All pages may be crawled, including by AI crawlers. A summary for language models is at /llms.txt.

User-agent: *
Allow: /
# Live data endpoints: change every few seconds and call a third-party API, so not worth crawling.
Disallow: /api/

Sitemap: ${sitemap}
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
