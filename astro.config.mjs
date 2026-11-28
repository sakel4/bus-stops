// @ts-check
import { defineConfig, envField } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// Node's types aren't installed, so read the environment through an untyped globalThis.
const env = /** @type {Record<string, string | undefined>} */ (
  /** @type {any} */ (globalThis).process.env
);

// Absolute URLs (link previews, later canonical/sitemap) need the public origin.
// SITE_URL overrides it; on Vercel the production domain is provided automatically.
const site =
  env.SITE_URL ??
  (env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:4321');

export default defineConfig({
  site,
  // Pages are prerendered; only the live arrivals endpoint runs as a Vercel function.
  adapter: vercel(),
  integrations: [
    // sitemap-index.xml, linked from robots.txt (src/pages/robots.txt.ts). Each URL also lists its
    // other-language version, matching the hreflang links in Layout.astro.
    sitemap({
      i18n: { defaultLocale: 'el', locales: { el: 'el', en: 'en' } },
      // The offline page is noindex; it exists only for the service worker.
      filter: (page) => !/\/offline\/$/.test(page),
    }),
  ],
  // The CSS is small (~14 KB); inlining it saves two render-blocking requests.
  build: { inlineStylesheets: 'always' },
  i18n: {
    locales: ['el', 'en'],
    defaultLocale: 'el',
    routing: {
      // Greek lives at "/", English at "/en/"
      prefixDefaultLocale: false,
    },
  },
  env: {
    schema: {
      // Read at runtime on the server only; see .env.example and src/lib/citybus-token.ts.
      CITYBUS_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
      GLOBAL_CONFIG: envField.string({ context: 'server', access: 'secret', optional: true }),
      VERCEL_API_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Build output (~2,500 files) isn't watched by default exclusions; watching it slows the dev
    // server enough on Windows to hit Vite's 60s module-load timeout.
    server: { watch: { ignored: ['**/dist/**', '**/.vercel/**'] } },
  },
});
