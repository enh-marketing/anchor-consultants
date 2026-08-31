# Sanity

**Status: live.** Project `ld89i91d` (Anchor Consulting), dataset `production`.
The schema is deployed, the content is imported, and the site builds from Sanity.

| In Sanity    | Count                                |
| ------------ | ------------------------------------ |
| Services     | 4, with feature cards and checklists |
| FAQs         | 6                                    |
| Testimonials | 7                                    |
| Blog posts   | 2, both unpublished (placeholders)   |
| Image assets | 13                                   |

## Running it

```bash
cd studio && npm install && npm run dev       # Studio on :3333
npx sanity schema deploy                       # after any schema change
```

The site reads Sanity when these are set, and the markdown in `src/content/`
when they are not. **`.env` is gitignored, so set them wherever you build,
including the host.**

```
PUBLIC_SANITY_PROJECT_ID=ld89i91d
PUBLIC_SANITY_DATASET=production
```

Both paths run through the same Zod schemas, so neither source can drift from
what the pages expect.

## Re-running the import

Safe to repeat: documents match on slug and are patched, images upload once.

```bash
cd studio && npx sanity exec scripts/import-from-markdown.mjs --with-user-token -- --dry-run
cd studio && npx sanity exec scripts/import-from-markdown.mjs --with-user-token
```

`--with-user-token` borrows the token the CLI already holds, so no credential
has to be created or stored. `scripts/migrate-to-sanity.mjs` also runs
standalone with `SANITY_WRITE_TOKEN` in the environment.

## Site Settings

The singleton holds everything that used to live in `src/data/site.ts`: identity,
contact details, all three link lists, the CTAs, disclaimers and the credit line.
Re-import it from the committed values with:

```bash
cd studio && npx sanity exec scripts/import-site-settings.mjs --with-user-token
```

`src/data/site.ts` stays in the repository as the fallback. `getSite()` merges
Sanity over it field by field, so a half-filled singleton degrades one field at
a time rather than emptying the header, and a Sanity outage during a build
leaves the committed values in place rather than failing the build.

Three things are derived at build time rather than stored, which is the point:
the `tel:`, `mailto:` and `wa.me` hrefs all come from single canonical fields.
The WordPress site carried three different phone numbers, one missing a digit,
and malformed `tel:` links (audit defect #4); that class of drift is now
impossible.

`SITE_URL` and `IS_PRODUCTION_HOST` deliberately stay in code. They gate
indexing, and a content edit must not be able to deindex the site.

## Hiding a document

Sanity has no `draft` field: a document is published or it is not. To hide one
while keeping its content:

```bash
cd studio && npx sanity exec scripts/unpublish.mjs --with-user-token -- <slug>
```

That is how both placeholder posts are kept out of the build and the sitemap.

## Rebuilding on content change

The build reads Sanity once, at build time. A content edit does not appear until
the site rebuilds, so add a webhook on the host pointing at its deploy hook —
that is the remaining piece of the CMS loop.

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

### Editing a page

Pages live under **Pages** in the Studio. A page is a title, a slug and an
ordered list of sections.

- **Reorder** by dragging a section in the list.
- **Hide** a section with its "Hide this section" toggle. The content stays; it
  just stops rendering. Nothing is lost and nothing needs undoing.
- **Add** a section with the add button, then pick a type.
- **Remove** a section to delete it and its content.

The slug is the URL, and `/` is the home page. Changing a slug changes the
address, and links to the old one break until a redirect exists (redirects are
M23).

Some sections pull their own content from elsewhere on purpose, so it is entered
once: the services carousel reads the `service` documents, the FAQ accordion
reads the `faq` documents, the testimonial carousel reads the `testimonial`
documents, and the leader profile reads the first `teamMember` by order. Those
sections let you edit the heading and the surrounding copy, not the items.

Three fields deliberately have no editable default in the imported home page:
the hero backdrop, the services carousel background and the leader profile
background. Leave them empty and the build-optimised local image is used, which
is faster. Fill one and it comes from Sanity instead.

Sections cannot change colours, fonts, sizes or spacing. That is not an
oversight: the layout was measured against the original site, and the CMS is
scoped to content so an edit cannot break it.

### Two things that need real thought

**Images — decided.** Content imagery now lives in Sanity and is served from
`cdn.sanity.io` through Sanity's image URL builder, wrapped by
`src/components/ui/CmsImage.astro`. That component renders one `<img>` from
either source, so `srcset`, `sizes`, WebP and the milestone 14 sizing all
survive the move. Two details worth keeping in mind:

- `fit=max` never upscales, so `CmsImage` clamps requested widths to the
  asset's own width. Without that the srcset advertises a 2x candidate the CDN
  serves at 1x, and dense displays fetch a second identical copy.
- Alt text is authored on the image object in the Studio and wins over any
  sibling `*Alt` frontmatter field, since the person replacing a photo is the
  person who should describe it.

Decorative and theme imagery (banners, backgrounds, icons) stays in
`src/assets/` and keeps going through Astro's optimiser.

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
