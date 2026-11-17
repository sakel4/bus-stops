// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

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
      // Read at runtime on the server only; see .env.example.
      CITYBUS_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
