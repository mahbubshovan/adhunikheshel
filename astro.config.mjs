import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
      persist: { path: '.wrangler/state/v3' },
    },
  }),
  integrations: [react()],
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
  },
});
