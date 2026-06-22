// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://havre.santiagovedia.com',
  build: { inlineStylesheets: 'always' },
  output: 'server',
  adapter: cloudflare(),
  image: {
    // Authorize Cloudinary so <Image> can optimize remote images from this host.
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
  },
  vite: {
    optimizeDeps: {
      exclude: ['bcryptjs'],
    },
  },
});