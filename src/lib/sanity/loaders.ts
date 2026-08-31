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
export const IMAGE = `{
  "src": asset->url,
  "assetId": asset->_id,
  "alt": coalesce(alt, ""),
  "decorative": coalesce(decorative, false),
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "lqip": asset->metadata.lqip
}`;

/**
 * Body copy, with any inline image's asset resolved.
 *
 * Portable Text stores an image as a reference, so without this the renderer
 * receives an unresolved pointer and drops the block — the image would simply
 * vanish from the article with nothing to explain it. `_ref` is named to match
 * what `PortableText.astro` reads.
 */
const BODY = `body[]{
  ...,
  _type == "captionedImage" => {
    "asset": asset->{
      url,
      "_ref": _id,
      "width": metadata.dimensions.width,
      "height": metadata.dimensions.height
    },
    alt,
    caption
  }
}`;

export const SEO = `{
  metaTitle,
  metaDescription,
  canonicalUrl,
  noindex,
  nofollow,
  ogTitle,
  ogDescription,
  "ogImage": ogImage.asset->url,
  "ogImageAlt": ogImage.alt,
  twitterTitle,
  twitterDescription,
  "twitterImage": twitterImage.asset->url,
  breadcrumbTitle,
  schemaType
}`;

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
      "body": ${BODY},
      "seo": seo${SEO}
    `,
  });

/**
 * Author, category and tag are references. They are resolved here rather than
 * on the page, so a template never has to know that the markdown fallback
 * stores a plain string where Sanity stores a document.
 *
 * `relatedPosts` resolves only what a card needs. Following the full projection
 * would pull each related post's body and its own related posts, and a pair of
 * posts referencing each other would recurse.
 */
const POST_CARD = `{
  "id": slug.current,
  title,
  publishedAt,
  excerpt,
  "coverImage": coverImage${IMAGE}
}`;

export const sanityPosts = () =>
  collection({
    type: 'post',
    order: 'publishedAt desc',
    projection: `
      "id": slug.current,
      title,
      publishedAt,
      updatedAt,
      "author": author->{ name, role, bio, "slug": slug.current, "photo": photo${IMAGE}, "links": links[]{ label, href } },
      excerpt,
      "coverImage": coverImage${IMAGE},
      "categories": categories[]->{ title, "slug": slug.current },
      "tags": tags[]->{ title, "slug": slug.current },
      "relatedPosts": relatedPosts[]->${POST_CARD},
      "body": ${BODY},
      "seo": seo${SEO}
    `,
  });

export const sanityCategories = () =>
  collection({
    type: 'category',
    order: 'title asc',
    projection: `
      "id": slug.current,
      title,
      "slug": slug.current,
      description,
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

/**
 * Sections carry images and rich text at several levels of nesting, so each
 * block projects its own. GROQ's conditional spread keeps that in one query:
 * `...` copies the block's plain fields, and the `_type ==` clauses replace the
 * fields that need an asset resolved.
 *
 * Slide and tile alt text is deliberately not projected as a sibling field. It
 * lives on the image object, `CmsImage` reads it from there, and having one
 * place for it is what stopped the leader portrait losing its description.
 */
export const SECTIONS = `sections[]{
  ...,
  _type == "heroCarousel" => {
    "slides": slides[]{ eyebrow, title, body, "image": image${IMAGE} },
    "backdrop": backdrop${IMAGE}
  },
  _type == "serviceHighlightRow" => {
    "tiles": tiles[]{ title, body, href, overlay, "image": image${IMAGE} }
  },
  _type == "aboutSplit" => {
    "images": images[]{ "image": ${IMAGE} }
  },
  _type == "servicesCarousel" => { "background": background${IMAGE} },
  _type == "leaderProfile" => { "background": background${IMAGE} },
  _type == "pageBanner" => { "image": image${IMAGE} },
  _type == "aboutIntro" => { "images": images[]{ "image": ${IMAGE} } },
  _type == "copyWithImage" => { "image": image${IMAGE} },
  _type == "skillsPanel" => { "image": image${IMAGE} }
}`;

export const sanityPages = () =>
  collection({
    type: 'page',
    order: 'title asc',
    projection: `
      "id": slug.current,
      title,
      "slug": slug.current,
      ${SECTIONS},
      "seo": seo${SEO}
    `,
  });
