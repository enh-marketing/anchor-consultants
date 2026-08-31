/**
 * Slug safety, shared by the Studio schemas and the test suite.
 *
 * Lives here rather than in `studio/` so it can be tested by
 * `npm test` — the Studio is a separate package with its own dependencies, and
 * a validation rule nobody exercises is a validation rule that quietly stops
 * working. The Studio imports it the same way its import scripts already import
 * `src/data/site.ts`.
 */

/**
 * Constrains a slug to characters that are safe in a URL and in a route pattern.
 *
 * Two reasons, and the second is specific to this deployment. A slug becomes a
 * path segment, so anything outside this set has to be percent-escaped and is a
 * readability problem at best.
 *
 * And `src/pages/[...slug].astro` feeds CMS slugs into the routing config that
 * `@astrojs/vercel` generates, which is compiled by `path-to-regexp` — a package
 * with a known backtracking-regex advisory (GHSA-9wv6-86v2-598j) and no forward
 * fix at the version the adapter depends on. Restricting the input is the
 * proportionate answer: the compilation happens at build time on patterns we
 * control, and those patterns can no longer contain regex metacharacters.
 */
export function isSafeSlug(value: unknown): true | string {
  if (typeof value !== 'string') return true;
  // The home page.
  if (value === '/') return true;

  // Page slugs are full paths and carry both slashes (`/about/`); every other
  // type stores a bare segment (`mortgage-solutions`) because its route prefix
  // is fixed. Both shapes are legitimate, so the surrounding slashes are
  // optional and stripped before the core is checked.
  const core = value.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!core) return 'Enter a slug.';

  // Lower-case segments joined by single hyphens or slashes. A nested page such
  // as `guides/first-time-buyers` is allowed; `--` and `//` are not.
  if (/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/.test(core)) return true;

  return 'Use lower-case letters, numbers and single hyphens or slashes, e.g. first-time-buyers.';
}
