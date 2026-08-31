// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

import { SITE_URL } from './src/data/site-url.mjs';
import { sitemapNoindex } from './src/lib/sitemap-noindex.mjs';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  // Static everywhere. The single form endpoint (src/pages/api/contact.ts)
  // opts out with `export const prerender = false`, which is what requires
  // an adapter — reCAPTCHA v3 must verify its token server-side.
  output: 'static',

  // Vercel, chosen by the client. Only the form endpoint runs as a function;
  // everything else is prerendered and served as static files.
  //
  // `webAnalytics` is deliberately off. It sets a cookie-free first-party
  // script, but it is still third-party data collection and turning it on is
  // the client's call, not a default.
  adapter: vercel(),

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
      // Route-level exclusions, the ones already known here at config time.
      // /privacy-policy/ is noindex while it is a holding page (see the page
      // comment and MIGRATION.md Q15), and listing a noindex URL contradicts
      // the robots tag.
      filter: (page) => !page.includes('/api/') && !page.includes('/privacy-policy/'),
    }),

    // Everything decided later. `noindex` can also come from an editor's toggle
    // in the Studio, which the filter above cannot see, so this reads the built
    // HTML and prunes whatever ended up hidden. Listed after the sitemap
    // integration so it runs once those files exist.
    sitemapNoindex(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
