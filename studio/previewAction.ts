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
 */
const SITE_URL =
  (typeof process !== 'undefined' ? process.env.SANITY_STUDIO_SITE_URL : undefined) ??
  'http://localhost:4321';

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
