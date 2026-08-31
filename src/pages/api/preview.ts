import type { APIRoute } from 'astro';
import { PREVIEW_COOKIE, previewAvailable, previewSecret } from '../../lib/sanity/preview';

/**
 * Turns draft preview on or off for this browser.
 *
 *   /api/preview?secret=…&path=/about/   enters preview and goes to that page
 *   /api/preview?exit=1                  leaves preview
 *
 * The secret is exchanged for an HttpOnly cookie on the first hop, so it appears
 * once in one URL rather than in every preview link — and never in a URL the
 * editor then shares or leaves in their history while browsing.
 *
 * `path` is validated as a path on this site. Without that, this route would be
 * an open redirector: anyone could send `?path=https://elsewhere/` and hand out
 * a link that looks like it belongs to this domain.
 */
export const prerender = false;

const html = (status: number, body: string) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Keep the secret out of the Referer header on the way to the next page.
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex, nofollow',
    },
  });

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  if (url.searchParams.get('exit')) {
    cookies.delete(PREVIEW_COOKIE, { path: '/' });
    return redirect('/', 302);
  }

  if (!previewAvailable()) {
    return html(
      503,
      '<h1>Preview is not configured</h1><p>Set SANITY_PREVIEW_TOKEN and PREVIEW_SECRET on the deployment.</p>',
    );
  }

  const supplied = url.searchParams.get('secret') ?? '';
  const expected = previewSecret() ?? '';
  // Length is compared first so the timing of the loop cannot leak it.
  const ok = supplied.length === expected.length && supplied === expected;
  if (!ok) {
    return html(401, '<h1>Not authorised</h1><p>That preview link is not valid.</p>');
  }

  const requested = url.searchParams.get('path') ?? '/';
  // A path on this site, and nothing that could be read as another origin or
  // climb out of /preview/. `..` is rejected outright rather than normalised:
  // there is no legitimate preview path that contains it.
  const safe =
    /^\/[\w\-/.]*\/?$/.test(requested) &&
    !requested.startsWith('//') &&
    !requested.split('/').includes('..');
  const target = safe ? requested : '/';

  cookies.set(PREVIEW_COOKIE, '1', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: url.protocol === 'https:',
    // Long enough for an editing session, short enough not to linger.
    maxAge: 60 * 60 * 4,
  });

  return redirect(`/preview${target === '/' ? '/' : target}`, 302);
};

export const ALL: APIRoute = () => html(405, '<h1>Method not allowed</h1>');
