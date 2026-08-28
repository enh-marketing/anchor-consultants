import type { APIRoute } from 'astro';
import { SITE_URL, IS_PRODUCTION_HOST } from '../data/site-url.mjs';

/**
 * robots.txt.
 *
 * Gated on the same flag as the per-page robots meta tag, so a staging build
 * cannot advertise itself. Anything other than a production build disallows
 * everything and omits the sitemap reference; only production opens up.
 *
 * `/api/` is disallowed in both cases — the contact endpoint accepts POST and
 * has nothing for a crawler.
 */
export const GET: APIRoute = () => {
  const body = IS_PRODUCTION_HOST
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        '',
        `Sitemap: ${new URL('/sitemap-index.xml', SITE_URL).href}`,
        '',
      ].join('\n')
    : ['# Non-production build. Indexing is disabled.', 'User-agent: *', 'Disallow: /', ''].join(
        '\n',
      );

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
