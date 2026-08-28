import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
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
 */

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
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Short label used on cards and in the nav carousel. */
      shortTitle: z.string().optional(),
      /** Card summary on /services/ and the homepage carousel. */
      summary: z.string(),
      icon: image().optional(),
      /**
       * All four services currently share one photo on WordPress
       * (audit defect #23). Optional so a shared fallback can be used
       * until distinct images are supplied.
       */
      heroImage: image().optional(),
      /** 1520x266 page banner. Falls back to a generic one where the client
          has not supplied a service-specific image (audit Q13). */
      bannerImage: image().optional(),
      /**
       * Three icon feature cards. Absent on Lease Rental Discounting,
       * hence optional (audit defect #24).
       */
      features: z
        .array(
          z.object({
            title: z.string(),
            icon: image().optional(),
          }),
        )
        .optional(),
      /** Blue-check bullet list. Also absent on some services. */
      checklist: z.array(z.string()).optional(),
      order: z.number().default(99),
      draft: z.boolean().default(false),
      seo,
    }),
});

/** → Sanity `testimonial` */
const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/testimonials' }),
  schema: z.object({
    name: z.string(),
    location: z.string(),
    quote: z.string(),
    order: z.number().default(99),
    /** No avatars or ratings exist on the source site; kept for later use. */
    avatar: z.string().optional(),
    rating: z.number().min(1).max(5).optional(),
  }),
});

/** → Sanity `faq` */
const faqs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faqs' }),
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    order: z.number().default(99),
  }),
});

/** → Sanity `post` */
const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      publishedAt: z.coerce.date(),
      updatedAt: z.coerce.date().optional(),
      author: z.string().default('Anchor Consultants'),
      excerpt: z.string(),
      coverImage: image().optional(),
      coverImageAlt: z.string().optional(),
      category: z.string().default('Uncategorized'),
      draft: z.boolean().default(false),
      seo,
    }),
});

/** → Sanity `teamMember` */
const team = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/team' }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      role: z.string(),
      photo: image().optional(),
      photoAlt: z.string().optional(),
      order: z.number().default(99),
    }),
});

export const collections = { services, testimonials, faqs, posts, team };
