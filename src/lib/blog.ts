import type { SanityImageValue } from './sanity/image';

/**
 * Normalises a post's author, categories and tags.
 *
 * The markdown fallback stores an author name and a category as plain strings;
 * Sanity stores references that the loader resolves into objects. Rather than
 * every template checking which it got, they call these once.
 *
 * The functions are deliberately total: a post with no categories returns an
 * empty array, not undefined, so a template can map over the result without a
 * guard. A missing author falls back to the site's own name, because a byline is
 * better than a blank.
 */

export interface Term {
  title: string;
  slug: string;
}

export interface PostAuthor {
  name: string;
  role: string | undefined;
  bio: string | undefined;
  photo: SanityImageValue | undefined;
  links: Array<{ label: string; href: string }>;
}

/** A term slug from a plain label, matching the shape Sanity's slugs take. */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface AuthorLike {
  name: string;
  role?: string | undefined;
  bio?: string | undefined;
  photo?: SanityImageValue | undefined;
  links?: Array<{ label: string; href: string }> | undefined;
}

export function postAuthor(
  author: string | AuthorLike | undefined,
  fallbackName: string,
): PostAuthor {
  if (typeof author === 'string') {
    return {
      name: author || fallbackName,
      role: undefined,
      bio: undefined,
      photo: undefined,
      links: [],
    };
  }
  if (!author) {
    return { name: fallbackName, role: undefined, bio: undefined, photo: undefined, links: [] };
  }
  return {
    name: author.name || fallbackName,
    role: author.role,
    bio: author.bio,
    photo: author.photo,
    links: author.links ?? [],
  };
}

/**
 * A post's categories, whichever source it came from.
 *
 * The markdown `category` string becomes a single term with a derived slug, so
 * the sidebar and the archive routes see one shape. Its slug will not match a
 * `category` document unless one exists with the same name, which is correct:
 * with Sanity off there are no archive pages to link to anyway.
 */
export function postCategories(data: {
  categories?: Term[] | undefined;
  category?: string | undefined;
}): Term[] {
  if (data.categories?.length) return data.categories;
  if (data.category) return [{ title: data.category, slug: slugify(data.category) }];
  return [];
}

export function postTags(data: { tags?: Term[] | undefined }): Term[] {
  return data.tags ?? [];
}

/**
 * Related posts for the end of an article.
 *
 * Hand-picked ones win. Otherwise posts are scored by shared tags and then
 * shared categories, which is a cheap heuristic that beats "most recent" and
 * costs nothing at build time. The post itself is always excluded, and so are
 * drafts — a "related" link to a page that does not exist would be worse than
 * showing nothing.
 */
export function relatedPosts<
  T extends {
    id: string;
    data: {
      draft?: boolean;
      tags?: Term[] | undefined;
      categories?: Term[] | undefined;
      category?: string | undefined;
    };
  },
>(current: T, all: T[], limit = 3): T[] {
  const tags = new Set(postTags(current.data).map((t) => t.slug));
  const cats = new Set(postCategories(current.data).map((c) => c.slug));

  const scored = all
    .filter((post) => post.id !== current.id && !post.data.draft)
    .map((post) => {
      const shareTags = postTags(post.data).filter((t) => tags.has(t.slug)).length;
      const shareCats = postCategories(post.data).filter((c) => cats.has(c.slug)).length;
      return { post, score: shareTags * 2 + shareCats };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.post);
}
