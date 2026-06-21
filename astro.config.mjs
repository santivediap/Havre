// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://havre.santiagovedia.com',
  build: { inlineStylesheets: 'always' },
  output: 'server',
  adapter: cloudflare(),
  vite: {
    optimizeDeps: {
      exclude: ['bcryptjs'],
    },
  },
});