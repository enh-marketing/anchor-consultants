// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

import { SITE_URL } from './src/data/site-url.mjs';
import { buildFixups } from './src/lib/build-fixups.mjs';
import { cmsRedirects } from './src/lib/cms-redirects.mjs';

// Redirects come from Sanity, so the config is built after fetching them. A
// top-level await here is what lets `redirects` be data rather than a literal.
const redirects = await cmsRedirects();

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,

  // Maintained in the Studio under Redirects. Astro turns these into real
  // routes with real status codes, which the Vercel adapter emits at the edge.
  redirects,

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
      // Only the API route, which is not a page at all.
      //
      // /privacy-policy/ used to be excluded here by name, because it is noindex
      // while it is a holding page. That became wrong the moment the page could
      // legitimately become indexable: a hardcoded exclusion would have kept the
      // published legal text out of the sitemap for ever. `buildFixups` prunes
      // whatever actually ended up noindex, which cannot fall out of step.
      filter: (page) => !page.includes('/api/'),
    }),

    // Everything decided later. `noindex` can also come from an editor's toggle
    // in the Studio, which the filter above cannot see, so this reads the built
    // HTML and prunes whatever ended up hidden. Listed after the sitemap
    // integration so it runs once those files exist.
    buildFixups(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});
