// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

import { SITE_URL } from './src/data/site-url.mjs';
import { buildFixups } from './src/lib/build-fixups.mjs';
import { cmsRedirects } from './src/lib/cms-redirects.mjs';

/**
 * `/admin` opens the Studio.
 *
 * Kept in code rather than in the Studio's own Redirects list, because it is
 * infrastructure and not editorial content. Two failure modes decide it: an
 * editor could delete the document and lose the shortcut, and `cmsRedirects()`
 * returns nothing when Sanity cannot be reached — which is precisely the moment
 * someone is most likely to be typing `/admin`.
 *
 * 302 rather than 301 on purpose. A permanent redirect is cached by the browser
 * and hard to take back, and this destination is a hostname that could move;
 * the cost of guessing wrong is an editor with a stale address baked into their
 * browser and no obvious way to clear it.
 *
 * It points at `/content` rather than the Studio root so the link lands on the
 * site's content, not a workspace picker. The enquiries workspace is one click
 * away, and `/admin/submissions` below goes straight there.
 */
const STUDIO = 'https://anchor-consultants.sanity.studio';

// Annotated so `302` keeps its literal type. Astro's `status` is a union of
// specific codes, and a bare object literal widens it to `number`.
/** @type {NonNullable<import('astro').AstroUserConfig['redirects']>} */
const studioRedirects = {
  '/admin': { status: 302, destination: `${STUDIO}/content` },
  '/admin/submissions': { status: 302, destination: `${STUDIO}/submissions` },
};

// Redirects come from Sanity, so the config is built after fetching them. A
// top-level await here is what lets `redirects` be data rather than a literal.
//
// The code-defined ones are spread last so they win. An editor cannot take
// `/admin` away by adding a redirect that claims the same path.
const redirects = { ...(await cmsRedirects()), ...studioRedirects };

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
