import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { sanityEnabled } from './lib/sanity/client';
import {
  sanityFaqs,
  sanityPosts,
  sanityServices,
  sanityTeam,
  sanityTestimonials,
} from './lib/sanity/loaders';
// Imported directly rather than re-exported from `astro:content`, which is
// deprecated in Astro 7.
import { z } from 'zod';

/**
 * Content schemas.
 *
 * These are deliberately shaped to mirror the Sanity document types planned
 * for a later migration (see MIGRATION.md section H.3). Pages read through
 * these collections rather than importing files directly, so swapping the
 * source to Sanity is a loader change, not a rewrite.
 *
 * Field names match the intended Sanity field names one-for-one.
 *
 * Each collection has two loaders. When `PUBLIC_SANITY_PROJECT_ID` is set the
 * content comes from Sanity; otherwise it comes from the markdown in
 * `src/content/`. The Zod schemas are shared, so whichever source is active is
 * validated the same way and a mismatch is a build error rather than a blank
 * section on a page. That is what makes Sanity a switch rather than a one-way
 * migration.
 */

/**
 * An image from either source. Local files arrive as Astro `ImageMetadata` and
 * are optimised at build time; Sanity images arrive as a URL plus dimensions
 * and are transformed by its CDN. `CmsImage` renders both, so a component does
 * not care which is configured.
 */
const sanityImage = z.object({
  src: z.string(),
  assetId: z.string().optional(),
  alt: z.string().default(''),
  decorative: z.boolean().default(false),
  width: z.number().optional(),
  height: z.number().optional(),
  lqip: z.string().optional(),
});

// Built inline at each field as `z.union([image(), sanityImage])`: `image()` is
// typed by Astro from the collection context, and re-declaring that signature
// by hand only loses the type.

/** Sanity stores body copy as Portable Text; markdown bodies stay strings. */
const portableText = z.array(z.record(z.string(), z.unknown())).optional();

const seo = z
  .object({
    /** Hand-written, 120–160 chars. Never auto-generated from body text. */
    metaDescription: z.string().min(50).max(200),
    metaTitle: z.string().optional(),
    ogImage: z.string().optional(),
  })
  .optional();

/** → Sanity `service` */
const services = defineCollection({
  loader: sanityEnabled
    ? sanityServices()
    : glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Short label used on cards and in the nav carousel. */
      shortTitle: z.string().optional(),
      /** Card summary on /services/ and the homepage carousel. */
      summary: z.string(),
      icon: z.union([image(), sanityImage]).optional(),
      /**
       * All four services currently share one photo on WordPress
       * (audit defect #23). Optional so a shared fallback can be used
       * until distinct images are supplied.
       */
      heroImage: z.union([image(), sanityImage]).optional(),
      /** 1520x266 page banner. Falls back to a generic one where the client
          has not supplied a service-specific image (audit Q13). */
      bannerImage: z.union([image(), sanityImage]).optional(),
      /**
       * Three icon feature cards. Absent on Lease Rental Discounting,
       * hence optional (audit defect #24).
       */
      features: z
        .array(
          z.object({
            title: z.string(),
            icon: z.union([image(), sanityImage]).optional(),
          }),
        )
        .optional(),
      /** Blue-check bullet list. Also absent on some services. */
      checklist: z.array(z.string()).optional(),
      order: z.number().default(99),
      draft: z.boolean().default(false),
      body: portableText,
      seo,
    }),
});

/** → Sanity `testimonial` */
const testimonials = defineCollection({
  loader: sanityEnabled
    ? sanityTestimonials()
    : glob({ pattern: '**/*.md', base: './src/content/testimonials' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      location: z.string(),
      quote: z.string(),
      order: z.number().default(99),
      /** No avatars or ratings exist on the source site; kept for later use. */
      avatar: z.union([image(), sanityImage]).optional(),
      rating: z.number().min(1).max(5).optional(),
    }),
});

/** → Sanity `faq` */
const faqs = defineCollection({
  loader: sanityEnabled ? sanityFaqs() : glob({ pattern: '**/*.md', base: './src/content/faqs' }),
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    order: z.number().default(99),
  }),
});

/** → Sanity `post` */
const posts = defineCollection({
  loader: sanityEnabled ? sanityPosts() : glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      author: z.string().default('Anchor Consultants'),
      excerpt: z.string(),
      coverImage: z.union([image(), sanityImage]).optional(),
      coverImageAlt: z.string().optional(),
      category: z.string().default('Uncategorized'),
      draft: z.boolean().default(false),
      seo,
    }),
});

/** → Sanity `teamMember` */
const team = defineCollection({
  loader: sanityEnabled ? sanityTeam() : glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      photo: z.union([image(), sanityImage]).optional(),
      photoAlt: z.string().optional(),
      order: z.number().default(99),
    }),
});

export const collections = { services, testimonials, faqs, posts, team };
