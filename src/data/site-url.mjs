/**
 * Canonical origin, and whether this build may be indexed.
 *
 * Read by `astro.config.mjs` (the sitemap and `site:`), by `src/lib/seo.ts`
 * (canonicals, Open Graph), by `robots.txt.ts` and by the build fixups. It is
 * build-time only — no client bundle imports it — so reading `process.env`
 * directly is safe here.
 *
 * Both values are derived from the environment rather than committed, because a
 * committed constant is a constant somebody has to remember to change. The
 * WordPress staging site was `noindex` sitewide and shipping that to production
 * would be a serious regression (audit defect #21); so would the reverse, a
 * staging deployment quietly indexing itself.
 */

const env = (key) => (typeof process === 'undefined' ? undefined : process.env?.[key]);

const trimSlashes = (value) => value.replace(/\/+$/, '');

/**
 * The origin, in order of preference:
 *
 *   1. `PUBLIC_SITE_URL` — an explicit override, for a host that is not Vercel
 *      or a domain Vercel does not know is the canonical one.
 *   2. Vercel's own production domain. Once a domain is connected in the Vercel
 *      dashboard, this is that domain, so connecting it is the only step.
 *   3. The production domain, hardcoded as the last resort.
 *
 * That last fallback is the real domain rather than a placeholder, now that it is
 * known. A local build therefore produces correct absolute URLs — still
 * `noindex`, because indexability is a separate question — which makes the
 * canonical and Open Graph tags checkable without deploying.
 */
const explicitUrl = env('PUBLIC_SITE_URL');
const vercelDomain = env('VERCEL_PROJECT_PRODUCTION_URL');

export const SITE_URL = explicitUrl
  ? trimSlashes(explicitUrl.startsWith('http') ? explicitUrl : `https://${explicitUrl}`)
  : vercelDomain
    ? `https://${trimSlashes(vercelDomain)}`
    : 'https://anchorconsultants.ae';

/**
 * Whether this build may be indexed. Anything else emits `noindex, nofollow`.
 *
 * `VERCEL_ENV` is `production` only on a production deployment, so preview
 * deployments and local builds are excluded automatically — which is the part a
 * committed flag kept getting wrong.
 *
 * `SITE_INDEXABLE` overrides in both directions, and the negative case is the
 * one that matters in practice: a production deployment that goes up before the
 * real domain is connected would otherwise be indexable at its `.vercel.app`
 * address, with canonicals pointing there. Getting a temporary hostname into
 * search results is the same class of mistake as shipping a `noindex` site, and
 * the first version of this had no way to prevent it.
 *
 * The default is deliberately the safe one: not indexable. A build that cannot
 * prove it is production is treated as though it is not.
 */
const indexableOverride = env('SITE_INDEXABLE');

export const IS_PRODUCTION_HOST =
  indexableOverride === 'false'
    ? false
    : indexableOverride === 'true' || env('VERCEL_ENV') === 'production';
