# Sanity

**Status: connected.** Project `ld89i91d`, dataset `production`. The Studio is in
`studio/`, the loaders are in `src/lib/sanity/`, and the switch is the
`PUBLIC_SANITY_PROJECT_ID` environment variable. The dataset is still empty —
run the import below to fill it.

## Getting it running

```bash
cd studio && npm install && npm run dev      # Studio on :3333
npx sanity schema deploy                      # push the schema
```

Back at the repository root, import the existing markdown and its images:

```bash
SANITY_WRITE_TOKEN=... node scripts/migrate-to-sanity.mjs --dry-run
SANITY_WRITE_TOKEN=... node scripts/migrate-to-sanity.mjs
```

Create that token at [sanity.io/manage](https://sanity.io/manage) with Editor
permission. It is only ever read from the environment, never from a file here.

Then flip the site over by setting these in `.env`:

```
PUBLIC_SANITY_PROJECT_ID=ld89i91d
PUBLIC_SANITY_DATASET=production
```

Unset the project id and the site goes back to reading `src/content/`. Both
paths are validated by the same Zod schemas, so neither can drift.

---

# Original migration notes

The content layer was built for this from the start. Every page reads through
Astro content collections rather than importing files or hardcoding copy, so
moving to Sanity is a **loader swap, not a rewrite**. Nothing in any `.astro`
page needs to change if the field names below are kept.

Read alongside `MIGRATION.md` section H.3.

---

## Where content lives today

| Source                          | Contents                                | Becomes                             |
| ------------------------------- | --------------------------------------- | ----------------------------------- |
| `src/content/services/*.md`     | 4 services                              | `service` documents                 |
| `src/content/testimonials/*.md` | 7 testimonials                          | `testimonial` documents             |
| `src/content/faqs/*.md`         | 6 questions                             | `faq` documents                     |
| `src/content/posts/*.md`        | 2 posts (placeholders)                  | `post` documents                    |
| `src/content/team/*.md`         | Leadership                              | `teamMember` documents              |
| `src/data/site.ts`              | Contact details, nav, CTAs, disclaimers | `siteSettings` singleton            |
| `src/assets/images/**`          | All imagery                             | Sanity assets, or leave in the repo |

Schemas are defined in `src/content.config.ts`. Treat that file as the
specification: the Sanity types below mirror it field for field.

---

## Document types

Field names match the frontmatter exactly. Keeping them identical is what makes
the page components work unchanged.

### `service`

| Field                 | Type                       | Notes                                                      |
| --------------------- | -------------------------- | ---------------------------------------------------------- |
| `title`               | string                     | required                                                   |
| `shortTitle`          | string                     | optional — card and carousel label                         |
| `summary`             | text                       | required — card summary                                    |
| `slug`                | slug                       | from the filename today                                    |
| `icon`                | image                      | optional                                                   |
| `heroImage`           | image                      | optional — all four currently share one photo (defect #23) |
| `bannerImage`         | image                      | optional — 1520×266; falls back to a generic banner        |
| `features`            | array of `{ title, icon }` | optional — absent on Lease Rental Discounting (defect #24) |
| `checklist`           | array of string            | optional — also absent on some services                    |
| `order`               | number                     | default 99                                                 |
| `draft`               | boolean                    | default false                                              |
| `seo.metaDescription` | text                       | **required, 120–160 chars, hand-written**                  |
| body                  | Portable Text              | the markdown body                                          |

### `post`

| Field                 | Type                | Notes                            |
| --------------------- | ------------------- | -------------------------------- |
| `title`               | string              | required                         |
| `publishedAt`         | datetime            | required                         |
| `updatedAt`           | datetime            | optional                         |
| `author`              | string              | defaults to "Anchor Consultants" |
| `excerpt`             | text                | required — shown on the index    |
| `coverImage`          | image               | optional                         |
| `coverImageAlt`       | string              | optional but write it            |
| `category`            | string or reference | defaults to "Uncategorized"      |
| `draft`               | boolean             | default false                    |
| `seo.metaDescription` | text                | required                         |
| body                  | Portable Text       |                                  |

If `category` becomes a reference to a `category` document, update the sidebar
grouping in `src/components/blog/BlogSidebar.astro`, which currently groups on
the string.

### `testimonial`

`name`, `location`, `quote`, `order`, plus optional `avatar` and `rating`.
The last two exist in the schema but not on the source site.

### `faq`

`question`, `answer`, `order`. The homepage accordion and its `FAQPage`
structured data both read this collection, so they cannot drift apart.

### `teamMember`

`name`, `role`, `photo`, `photoAlt`, `order`.

### `siteSettings` (singleton)

Everything in `src/data/site.ts`: contact details, primary nav, footer links,
legal links, CTA labels and hrefs, disclaimers, credit line.

Two cautions:

- **The phone number is a single source of truth here.** The WordPress site
  had three different numbers, one missing a digit (defect #4). Keep exactly
  one field and derive both the display string and the `tel:` href from it.
- `SITE_URL` and `IS_PRODUCTION_HOST` must **stay in code**, in
  `src/data/site-url.mjs`. They gate indexing, and putting them behind an
  editable CMS field would let a content edit deindex the site.

---

## How to do the swap

Astro content collections take a `loader`. Today every collection uses `glob()`
over markdown. A Sanity loader replaces that, and nothing downstream changes.

```ts
// src/content.config.ts — sketch
import { defineCollection } from 'astro:content';
import { sanityLoader } from './lib/sanity-loader';

const services = defineCollection({
  loader: sanityLoader({ type: 'service' }),
  // The Zod schema stays exactly as it is: it is the contract the pages rely
  // on, and it now validates what comes back from Sanity too.
  schema: /* unchanged */,
});
```

Order of work:

1. Create the Sanity project and write the schemas above.
2. Import the existing markdown. Four services, two posts, seven testimonials
   and six FAQs — small enough to paste by hand, but a script over the
   frontmatter is quicker and less error-prone.
3. Write the loader and swap one collection, ideally `faqs`, since it is the
   simplest and is rendered in two places (accordion and JSON-LD). If both
   still render, the pattern is right.
4. Swap the rest.
5. Move `src/data/site.ts` to the `siteSettings` singleton last. It is
   imported in the most places, so it is the most disruptive and the least
   urgent.

### Two things that need real thought

**Images.** `image()` in the current schemas gives Astro's optimiser a local
file, which is where the responsive `srcset` and WebP output come from. Sanity
serves images through its own CDN with a different transform API. Either keep
imagery in the repo and reference it by path from Sanity, or switch the
components to Sanity's image URL builder — but do not leave them as bare
`<img>` tags, or the work in milestone 14 on image sizing is lost.

**Portable Text.** Markdown bodies become Portable Text. The blog post template
styles its body with a `.prose-body` block in
`src/pages/blog/[slug].astro`; a Portable Text renderer needs the same
treatment, or the typography regresses.

---

## Do not lose these in the migration

Content decisions that are easy to undo by accident:

- Every page needs a **hand-written** 120–160 character meta description.
  Nothing auto-generates one from body text. The WordPress site did, and
  produced descriptions like "No testimonials found" and the gibberish body of
  the dummy post (defect #22).
- Blog placeholder posts must be replaced, not published as-is.
- The privacy policy is a deliberate holding page and is `noindex`. When real
  text lands, remove the `noindex` in `src/pages/privacy-policy.astro` **and**
  the sitemap exclusion in `astro.config.mjs`.
- Alt text is content. 44 images carry meaningful alt text and 47 are
  explicitly decorative; a CMS field with no guidance will produce neither.
