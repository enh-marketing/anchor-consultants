// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

import { SITE_URL } from './src/data/site-url.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  // Static everywhere. The single form endpoint (src/pages/api/contact.ts)
  // opts out with `export const prerender = false`, which is what requires
  // an adapter — reCAPTCHA v3 must verify its token server-side.
  output: 'static',

  // Neutral adapter: runs locally via `npm run preview` and on any Node host.
  // Swapping to @astrojs/vercel or @astrojs/netlify later is this one line.
  adapter: node({ mode: 'standalone' }),

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
      // /privacy-policy/ is noindex while it is a holding page (see the
      // page comment and MIGRATION.md Q15). Listing a noindex URL in the
      // sitemap contradicts the robots tag, so it is excluded until the
      // client supplies the approved text.
      filter: (page) => !page.includes('/api/') && !page.includes('/privacy-policy/'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
