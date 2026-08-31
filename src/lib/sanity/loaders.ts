import type { Loader } from 'astro/loaders';
import { sanityClient } from './client';

/**
 * Content collection loaders backed by Sanity.
 *
 * The point of these is that `src/content.config.ts` keeps its Zod schemas
 * unchanged. A loader's job is only to fetch documents and hand them over in
 * the shape those schemas already validate, which is why every query below
 * projects Sanity's field names onto the frontmatter names the pages use:
 * `slug.current` becomes the entry `id`, `_id` is dropped, and image objects
 * are flattened to `{ src, alt, decorative }`.
 *
 * The schemas then validate what comes back from Sanity exactly as they
 * validated the markdown, so a schema mismatch is a build error rather than a
 * blank section on a page.
 */

/** Projection shared by every image field, matching the `altImage` object. */
const IMAGE = `{
  "src": asset->url,
  "assetId": asset->_id,
  "alt": coalesce(alt, ""),
  "decorative": coalesce(decorative, false),
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "lqip": asset->metadata.lqip
}`;

const SEO = `{ metaDescription, metaTitle, "ogImage": ogImage.asset->url }`;

interface Options {
  /** GROQ document type. */
  type: string;
  /** Projection body, without the surrounding braces. */
  projection: string;
  /** GROQ ordering clause. */
  order: string;
  /** Field to use as the entry id. Defaults to the slug. */
}

/**
 * GROQ returns `null` for a field that is not set, while Zod's `.optional()`
 * expects it to be absent — and Zod reports a stray null as "expected string,
 * received object", which is a confusing way to learn this. Stripping nulls
 * makes "not set" mean the same thing on both sides.
 */
function stripNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripNulls) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === null) continue;
      out[k] = stripNulls(v);
    }
    return out as T;
  }
  return value;
}

function collection({ type, projection, order }: Options): Loader {
  return {
    name: `sanity-${type}`,
    load: async ({ store, logger, parseData, generateDigest }) => {
      const query = `*[_type == "${type}" && !(_id in path("drafts.**"))] | order(${order}) { ${projection} }`;
      const docs = await sanityClient().fetch<Array<Record<string, unknown>>>(query);

      store.clear();
      for (const raw of docs) {
        const doc = stripNulls(raw);
        const id = String(doc['id'] ?? '');
        if (!id) {
          logger.warn(`Skipped a ${type} with no slug — it cannot have a URL.`);
          continue;
        }
        // Remove the helper key so it does not have to exist in the Zod schema.
        const { id: _drop, ...data } = doc;
        const parsed = await parseData({ id, data });
        store.set({ id, data: parsed, digest: generateDigest(parsed) });
      }

      logger.info(`Loaded ${docs.length} ${type} document(s) from Sanity`);
    },
  };
}

export const sanityServices = () =>
  collection({
    type: 'service',
    order: 'order asc',
    projection: `
      "id": slug.current,
      title,
      shortTitle,
      summary,
      "icon": icon${IMAGE},
      "heroImage": heroImage${IMAGE},
      "bannerImage": bannerImage${IMAGE},
      "features": features[]{ title, "icon": icon${IMAGE} },
      checklist,
      order,
      "body": body,
      "seo": seo${SEO}
    `,
  });

export const sanityPosts = () =>
  collection({
    type: 'post',
    order: 'publishedAt desc',
    projection: `
      "id": slug.current,
      title,
      publishedAt,
      updatedAt,
      author,
      excerpt,
      "coverImage": coverImage${IMAGE},
      category,
      "body": body,
      "seo": seo${SEO}
    `,
  });

export const sanityFaqs = () =>
  collection({
    type: 'faq',
    order: 'order asc',
    // No slug on this type, so the document id is the entry id. It is stable
    // across edits, which keeps Astro's content cache honest.
    projection: `"id": _id, question, answer, order`,
  });

export const sanityTestimonials = () =>
  collection({
    type: 'testimonial',
    order: 'order asc',
    projection: `
      "id": _id,
      name,
      location,
      quote,
      order,
      "avatar": avatar${IMAGE},
      rating
    `,
  });

export const sanityTeam = () =>
  collection({
    type: 'teamMember',
    order: 'order asc',
    projection: `
      "id": _id,
      name,
      role,
      bio,
      "photo": photo${IMAGE},
      order
    `,
  });
