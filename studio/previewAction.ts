import type { DocumentActionComponent, DocumentActionsContext } from 'sanity';

/**
 * "Open preview" on a page document.
 *
 * Opens `/preview/<slug>/` on the site, which renders the draft through the same
 * components a published page uses.
 *
 * It deliberately carries no secret. The preview route is gated by an HttpOnly
 * cookie that `/api/preview?secret=…` sets, and the Studio is client-side
 * JavaScript — a secret it could read would not be a secret. So the flow is:
 * whoever runs the deployment gives the editor one link containing the secret,
 * the editor follows it once, and the cookie carries them for the next few
 * hours. This action is the convenience after that, not the way in.
 *
 * Without the cookie the preview route answers 404 rather than explaining
 * itself, which is the right answer to a request that has not proved anything.
 *
 * `SANITY_STUDIO_SITE_URL` is a public value — the address of the site — so it
 * belongs in the Studio's environment rather than in code, where a change of
 * domain would mean a code change.
 *
 * The fallback depends on the build, because a Studio env file cannot be relied
 * on. `.env*` is gitignored at every level, so `studio/.env` exists only on the
 * machine that wrote it; a deploy from anywhere else would silently fall back.
 * A single hardcoded localhost default therefore shipped a dead button to the
 * hosted Studio. Splitting it means each build is right with no env file at all:
 * `sanity dev` points at the local site, and a deployed Studio points at the
 * production domain, which matches `SITE_URL`'s own fallback in
 * `src/data/site-url.mjs` so the two cannot disagree. Setting the variable still
 * overrides both, which is what a staging Studio would do.
 *
 * The origin has to match wherever the editor first opened
 * `/api/preview?secret=…`, because that route sets an HttpOnly cookie and
 * cookies do not cross origins. A preview button pointing at a different host
 * than the one that granted the cookie answers 404, which looks like a broken
 * feature rather than a mismatched origin.
 */
// Read through the same `typeof process` guard the variable above uses. If the
// guard ever fails, this reads `undefined` and the site URL below falls to the
// production domain — the safe direction, since a hosted Studio pointing at
// localhost is the bug being fixed here.
const IS_DEV =
  (typeof process !== 'undefined' ? process.env.NODE_ENV : undefined) === 'development';

const SITE_URL =
  (typeof process !== 'undefined' ? process.env.SANITY_STUDIO_SITE_URL?.trim() : undefined) ||
  (IS_DEV ? 'http://localhost:4321' : 'https://anchorconsultants.ae');

/** `/about/` and `about` both become `/about/`. `/` stays `/`. */
function toPath(slug: unknown): string | null {
  if (typeof slug !== 'string' || !slug.trim()) return null;
  const trimmed = slug.trim();
  if (trimmed === '/') return '/';
  return `/${trimmed.replace(/^\/+|\/+$/g, '')}/`;
}

export const openPreviewAction: DocumentActionComponent = (props) => {
  const doc = (props.draft ?? props.published) as { slug?: { current?: string } } | null;
  const path = toPath(doc?.slug?.current);

  return {
    label: 'Open preview',
    // Disabled rather than hidden when there is no slug: hiding it would look
    // like the feature does not exist, rather than like the page needs a slug.
    disabled: !path,
    title: path
      ? `Opens ${path} on the site, showing unpublished changes`
      : 'Give this page a slug first',
    onHandle: () => {
      if (path) {
        const base = SITE_URL.replace(/\/+$/, '');
        window.open(`${base}/preview${path}`, '_blank', 'noopener,noreferrer');
      }
      props.onComplete();
    },
  };
};

/** Adds the action to page documents only; other types have no preview route. */
export function documentActions(
  prev: DocumentActionComponent[],
  context: DocumentActionsContext,
): DocumentActionComponent[] {
  return context.schemaType === 'page' ? [openPreviewAction, ...prev] : prev;
}
