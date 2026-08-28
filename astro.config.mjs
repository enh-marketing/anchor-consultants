// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

import { SITE_URL } from './src/data/site-url.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  // Static everywhere. The single form endpoint opts out with
  // `export const prerender = false` once reCAPTCHA + SMTP land.
  output: 'static',

  build: {
    // Matches the WordPress URL shape: /about/ rather than /about.html
    format: 'directory',
  },

  image: {
    // Only local assets are used. No remote patterns are allowed on purpose:
    // the WordPress build hotlinked the theme author's demo server, and this
    // makes that class of mistake impossible to reintroduce.
    domains: [],
    remotePatterns: [],
  },

  integrations: [
    sitemap({
      filter: (page) => !page.includes('/api/'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
