import { getEntry } from 'astro:content';

/**
 * Helpers for a route that can be driven by a `page` document.
 *
 * Every page follows the same two-line pattern: ask for its sections, and fall
 * back to the ones it ships with when there is no document. Putting it here
 * keeps that from being retyped, and keeps the fallback rule in one place so it
 * cannot drift page by page.
 *
 * A page's fallback is the fixed route itself, which is why there is no
 * markdown collection behind this. With Sanity switched off the routes render
 * exactly what they rendered before the CMS existed.
 */

type Section = Record<string, unknown>;

export async function pageSections(slug: string): Promise<Section[]> {
  const entry = await getEntry('pages', slug);
  return entry?.data.sections ?? [];
}

/**
 * The page's meta description, from the CMS when set.
 *
 * The fallback is required rather than optional: descriptions on this site are
 * hand-written and never generated from body text, so a page with no
 * description is a bug the type system should catch.
 */
export async function pageDescription(slug: string, fallback: string): Promise<string> {
  const entry = await getEntry('pages', slug);
  return entry?.data.seo?.metaDescription ?? fallback;
}

/**
 * Slugs that already have a route file of their own.
 *
 * `[...slug].astro` skips these rather than competing with them. Two pages
 * genuinely cannot be served by a catch-all: `404.astro` is where Astro looks
 * for the not-found page, and the named routes carry per-page structured data
 * and the shipped fallbacks a catch-all cannot know about.
 *
 * This lives here rather than in the route because Astro extracts
 * `getStaticPaths` into its own chunk at build time, and that chunk keeps its
 * imports but not the module-level constants around it.
 */
export const NAMED_ROUTES = new Set([
  '/',
  '/about/',
  '/services/',
  '/testimonials/',
  '/blog/',
  '/contact/',
  '/privacy-policy/',
  '/404/',
]);

/** Normalises a CMS slug to the `/thing/` shape the site uses everywhere. */
export function normalisePath(slug: string): string {
  const trimmed = slug.trim();
  if (trimmed === '/' || trimmed === '') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}
