import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      external: ['better-sqlite3'],
    },
  },
});
