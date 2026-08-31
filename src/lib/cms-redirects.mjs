import { createClient } from '@sanity/client';
import { loadEnv } from 'vite';

/**
 * Redirects, read from Sanity at build time.
 *
 * Imported by `astro.config.mjs`, which is why this is `.mjs` and reads its own
 * environment: the config runs before Astro has set up `import.meta.env`, so
 * `loadEnv` is how the `.env` file is reached from here.
 *
 * Astro turns the returned map into real routes, which the Vercel adapter emits
 * as edge redirects with a real status code. `sitemap-noindex.mjs` then widens
 * each pattern to tolerate a trailing slash — see the note there.
 *
 * Everything degrades to no redirects rather than failing the build. A CMS
 * outage should not stop a deploy, and a site with no redirects still works;
 * one that will not build does not.
 *
 * One rule here is a guard rather than a tidy-up. Astro gives a redirect
 * precedence over a page route, and the emitted redirect sits ahead of the
 * filesystem handler, so a redirect whose `from` is a page that still exists
 * does not shadow that page — it stops it being built at all. Adding a redirect
 * from `/about/` would delete the About page from the site. Those are refused,
 * loudly, and that is why the live slugs are fetched alongside the redirects.
 */

/**
 * Paths that are routes in their own right, independent of any CMS document.
 * Kept in step with `NAMED_ROUTES` in `src/lib/page.ts`.
 */
const RESERVED = new Set([
  '/',
  '/about',
  '/services',
  '/testimonials',
  '/blog',
  '/contact',
  '/privacy-policy',
  '/404',
  '/api/contact',
]);

/** Reject anything that cannot be a path on this site. */
function isPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !/^https?:\/\//.test(value);
}

function isDestination(value) {
  return typeof value === 'string' && (value.startsWith('/') || /^https?:\/\//.test(value));
}

/** Trailing slashes are normalised away so `/a` and `/a/` cannot both be listed. */
const key = (path) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

export async function cmsRedirects() {
  const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
  const projectId = env.PUBLIC_SANITY_PROJECT_ID ?? process.env.PUBLIC_SANITY_PROJECT_ID;
  const dataset = env.PUBLIC_SANITY_DATASET ?? process.env.PUBLIC_SANITY_DATASET ?? 'production';
  if (!projectId) return {};

  let docs = [];
  let live = new Set();
  try {
    const client = createClient({ projectId, dataset, apiVersion: '2024-10-01', useCdn: false });
    const [redirectDocs, slugs] = await Promise.all([
      client.fetch(
        `*[_type == "redirect" && active != false && !(_id in path("drafts.**"))]
          | order(from asc){ from, to, permanent }`,
      ),
      // Every path a document publishes, so a redirect cannot be aimed at one.
      client.fetch(`{
        "pages": *[_type == "page" && !(_id in path("drafts.**"))].slug.current,
        "services": *[_type == "service" && !(_id in path("drafts.**"))].slug.current,
        "posts": *[_type == "post" && !(_id in path("drafts.**"))].slug.current,
        "categories": *[_type == "category" && !(_id in path("drafts.**"))].slug.current
      }`),
    ]);
    docs = redirectDocs ?? [];

    for (const slug of slugs?.pages ?? [])
      if (slug) live.add(key(slug.startsWith('/') ? slug : `/${slug}`));
    for (const slug of slugs?.services ?? []) if (slug) live.add(key(`/services/${slug}`));
    for (const slug of slugs?.posts ?? []) if (slug) live.add(key(`/blog/${slug}`));
    for (const slug of slugs?.categories ?? []) if (slug) live.add(key(`/blog/category/${slug}`));
  } catch (error) {
    console.warn(
      '[redirects] Could not read redirects from Sanity; building without them.',
      error instanceof Error ? error.message : error,
    );
    return {};
  }

  const redirects = {};
  const seen = new Map();

  for (const doc of docs ?? []) {
    if (!isPath(doc?.from) || !isDestination(doc?.to)) {
      console.warn(`[redirects] Skipping an incomplete redirect: ${JSON.stringify(doc)}`);
      continue;
    }

    const from = key(doc.from);
    const to = doc.to;

    if (from === key(to)) {
      console.warn(`[redirects] Skipping ${from}: it redirects to itself.`);
      continue;
    }

    // The important one. Astro would drop the page rather than shadow it.
    if (RESERVED.has(from) || live.has(from)) {
      console.warn(
        `[redirects] REFUSING to redirect ${from}: that page still exists, and Astro would ` +
          `stop building it rather than serve it. Delete or rename the page first, or point ` +
          `the redirect at a path nothing publishes.`,
      );
      continue;
    }

    // Two rules for the same path is a contradiction, not a preference. The
    // first alphabetically wins and the clash is reported rather than silently
    // resolved, because whichever loses would look like it simply never worked.
    if (seen.has(from)) {
      console.warn(
        `[redirects] Two redirects claim ${from} (→ ${seen.get(from)} and → ${to}). ` +
          `Keeping the first; remove one in the Studio.`,
      );
      continue;
    }

    seen.set(from, to);
    redirects[from] = { status: doc.permanent === false ? 302 : 301, destination: to };
  }

  // A chain means an extra round trip for every visitor who follows it, and a
  // cycle means an infinite one. Both are collapsed to point at the final
  // destination, so the data can stay as the editor wrote it.
  for (const [from, entry] of Object.entries(redirects)) {
    const visited = new Set([from]);
    let destination = entry.destination;
    while (isPath(destination) && seen.has(key(destination))) {
      const next = key(destination);
      if (visited.has(next)) {
        console.warn(`[redirects] ${from} is part of a redirect loop; dropping it.`);
        delete redirects[from];
        destination = null;
        break;
      }
      visited.add(next);
      destination = seen.get(next);
    }
    if (destination && destination !== entry.destination) {
      console.warn(
        `[redirects] ${from} chained through other redirects; pointing it straight at ${destination}.`,
      );
      entry.destination = destination;
    }
  }

  const count = Object.keys(redirects).length;
  if (count) console.log(`[redirects] ${count} redirect(s) from Sanity`);
  return redirects;
}
