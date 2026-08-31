import type { SlugValidationContext } from 'sanity';

/**
 * Rejects a slug already used by another document of the same type.
 *
 * Sanity does not enforce this by itself, and two documents sharing a slug is a
 * genuine failure rather than a warning: the second one silently overwrites the
 * first in the content collection, so a page or a service simply disappears
 * from the site with nothing to explain why.
 *
 * The draft and published versions of one document share an id apart from the
 * `drafts.` prefix, so both are excluded — otherwise every document would
 * report itself as a duplicate the moment it had unsaved changes.
 */
export async function isUniqueSlug(slug: string, context: SlugValidationContext) {
  const { document, getClient } = context;
  if (!document) return true;

  const id = document._id.replace(/^drafts\./, '');
  const params = { draft: `drafts.${id}`, published: id, slug, type: document._type };

  const taken = await getClient({ apiVersion: '2024-10-01' }).fetch<boolean>(
    `defined(*[_type == $type && slug.current == $slug && !(_id in [$draft, $published])][0]._id)`,
    params,
  );
  return !taken;
}
