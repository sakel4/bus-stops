// @ts-check
import { defineConfig, envField } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
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
