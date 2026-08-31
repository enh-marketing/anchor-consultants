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

The slug is the URL, and `/` is the home page. A page whose slug does not match
an existing route is published at that address automatically, so creating a new
page needs no developer. The existing pages keep their own routes because they
carry structured data the generic route cannot know about.

Changing a slug changes the address, and links to the old one break until a
redirect exists (redirects are M23).

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

### Site Settings

One document, opened from the top of the sidebar. The tabs are Identity,
Branding, Contact, Navigation, Footer, Calls to action, and Legal & credits.

A few fields are empty on purpose, and empty means "show nothing" rather than
"not configured yet":

- **Branding.** The logo and favicon that ship with the site are already
  optimised, and the favicon is a vector so it stays sharp at any size.
  Uploading replaces them; leaving them empty keeps the better default.
- **Opening hours.** The site shows none today. Entering hours _adds_ a row to
  the contact page.
- **Social profiles.** Adding one shows a row of icons in the footer. Pick the
  platform from the list, since that chooses the icon and what a screen reader
  reads, and paste the full profile URL rather than the platform home page.

**Footer buttons** are described by what they do, not by a URL. "Call us" always
uses the phone number from the Contact tab, so it cannot fall out of step with
it. A button set to "Go to a page" with no destination is not rendered.

The phone number is stored once, in international format. Every `tel:` link on
the site is built from it.

### Previewing a draft

Editing a page and want to see it before publishing? Save your changes as a
draft, then use **Open preview** in the document's action menu. It opens the page
on the site showing your unpublished changes, with a dark bar at the top saying
so.

**The first time**, you need a one-off link from whoever runs the deployment:

    https://your-domain/api/preview?secret=…&path=/about/

Follow it once and your browser is in preview mode for the next four hours. After
that, **Open preview** works on its own. "Leave preview" in the bar turns it off.

Preview pages are never indexed by search engines and are not visible to anyone
without that cookie — a visitor who guesses the address gets a plain 404.

**What can be previewed:** pages. Blog posts and service pages have their own
templates rather than the section builder, so previewing those is not wired up
yet; publishing and looking at the result is the way to check one for now.

### Redirects

**Redirects** in the sidebar sends an old address to a new one. Use it whenever a
URL changes, so links and search results pointing at the old one keep working.

- **Old address** is a path on this site, starting with a slash. It works with or
  without a trailing slash.
- **New address** can be a path here or a full URL somewhere else.
- **Permanent (301)** is almost always right: it tells search engines the page has
  moved for good and transfers its standing. Turn it off for something temporary.
- **Active** lets you switch a redirect off without deleting it and losing the note.
- **Why** is worth filling in. In a year nobody will remember, and an unexplained
  redirect is one nobody dares remove.

**You cannot redirect a page that still exists.** The Studio will refuse it, and
so will the build. This is not fussiness: a redirect takes precedence over the
page, so it would not shadow the page, it would remove it from the site. Rename
or delete the page first.

Chains are tidied up automatically. If A points to B and B points to C, visitors
go straight from A to C. A circular set is dropped rather than sending anyone
round in circles.

### Form submissions

Enquiries are in a **separate Studio workspace**, not in the sidebar with the
content. Switch to it with the workspace picker at the top of the Studio, or go
straight to `/submissions`. Content is at `/content`.

They are kept apart for a reason. The content dataset is readable by anyone —
that is what lets the site build without a password, and it is fine for content
that is published anyway. Enquiries carry names, emails and phone numbers, so
they live in a private dataset that cannot be read without a token.

The list shows every enquiry, newest first, with the name and email in the title
so it can be scanned.

Everything is read-only. An enquiry is a record of what somebody sent, so it
cannot be edited — only read, and eventually deleted under the retention policy.

`EMAIL NOT SENT` in a row means the enquiry was received and stored but the
notification email failed. Those need following up by hand.

Two things worth knowing:

- **No IP addresses are kept.** Rate limiting needs to recognise a repeat
  submitter, not identify one, so only a one-way hash is stored.
- **These are personal data.** Anyone who can open this workspace can read every
  enquiry. They are no longer in the same dataset as the content, so read access
  can be granted separately — ask before giving submissions access to someone who
  only needs to edit content.

Old submissions are deleted by a script, not automatically. The retention window
has not been decided yet — that is a decision for whoever owns the data.

### Editing a form

**Forms** in the sidebar holds the enquiry form and the CV upload form. Editing
a field changes both what a visitor sees and what the server accepts, so marking
something required really does require it.

- **Field name** is what the field is submitted under and what the notification
  email calls it. Lower case, no spaces.
- **Type** matters: email and phone are checked for format, not just presence.
  File uploads accept PDF or Word up to 5 MB.
- **Half width** fields pair up side by side on the enquiry form. It is not a
  size — those are the only two widths the design has.
- **Send submissions to** is optional. Leave it empty and the site email address
  is used. Hosting can override it, so if enquiries are arriving somewhere
  unexpected, check with whoever runs the deployment before editing this.

Turning on **also email the person who submitted** sends a plain-text
acknowledgement. It is plain text deliberately: an editable message rendered as
HTML into an email is a security risk, and plain text reads fine.

What is _not_ here, and should not be: the mail server details and the
reCAPTCHA secret. Those are deployment settings, not content, and this document
is readable by everyone with access to the dataset.

You cannot create a brand-new form here and have it appear on the site — a form
needs a page to put it on. Ask a developer to add the route, then it becomes
editable like these two.

### Writing a blog post

The sidebar has four blog entries: **Blog posts**, **Blog categories**, **Blog
tags** and **Authors**.

Set these up once, then reuse them:

- **Authors.** One document per person, with a role, photo and short bio. A post
  points at an author, so changing a role or photo updates every article at once.
- **Categories.** Each one gets its own page at `/blog/category/<slug>/`, so give
  it a description and, if you want, its own SEO. A category with no posts gets
  no page — an empty archive would compete in search with the pages that matter.
- **Tags.** Just a label. No page of its own, on purpose. Tags also drive the
  "Related reading" suggestions at the end of a post.

On the post itself: one category is usually right, and the Studio caps it at
three. Leave **Related posts** empty and posts sharing a tag or category are
suggested automatically; fill it in and your choices are used instead.

**Images inside the body** can carry a caption as well as alt text. They are
different things and both are worth filling in: the alt describes the picture for
someone who cannot see it, the caption is copy everyone reads.

**Drafts stay off the site.** An unpublished post is not built, not in the
sitemap, and not in the sidebar.

### SEO on a page

Every page, service and post has an SEO section with three tabs.

**Basics.** The search title and meta description are what Google shows. The
site name is added to the title automatically, so do not type it again. The
description has to be 120 to 160 characters — that is enforced, because the
WordPress site let a plugin invent descriptions and one of them read "No
testimonials found".

The **target phrase** field is a note for whoever writes the page. It is not
published anywhere. Keyword meta tags have been ignored by search engines for
years, so a field that pretended to publish one would be misleading.

**Social sharing.** Leave all of it empty and sharing still works: X falls back
to the Open Graph fields, and those fall back to the search title and
description. Only fill a field when it should differ. If you add a share image,
give it alt text — it is used.

**Advanced.** "Hide from search engines" takes a page out of search results and
out of the sitemap. There is no switch for the opposite, on purpose: whether the
site is indexable at all is decided by the build, so this can only ever hide a
page. Leave the canonical URL empty unless the page deliberately duplicates one
elsewhere. Set the page type only if it is accurate.

**Slugs must be unique.** The Studio will refuse a slug another page already
uses. Two pages sharing one would mean the second silently replaces the first on
the site.

### What is editable where

| Page         | What you can change from the Studio                                   |
| ------------ | --------------------------------------------------------------------- |
| Home         | All eight sections: hero slides, tiles, About copy, headings, buttons |
| About        | Banner, eyebrow, headings, both bodies, image pair, single image      |
| Services     | Banner, card link text, skills heading, copy, bars, image             |
| Testimonials | Banner and the screen-reader heading; quotes are `testimonial` docs   |
| Blog         | Banner and the empty-state copy; posts are `post` docs                |
| 404          | Banner, large number, heading, body, button                           |
| Privacy      | Not yet in the CMS — see below                                        |
| Contact      | Not yet in the CMS — the form is milestone 21                         |

The privacy policy stays on its route on purpose: its prose reads the live
contact email, phone and address from Site Settings, and a CMS body would freeze
those. Create a `page` document with slug `/privacy-policy/` when the approved
legal text arrives and it will take over.

### Two things need real thought

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

---

## Publishing to the live site

Publishing in the Studio updates the content, but the site is a static build, so
the pages a visitor sees are the ones from the last build. Until the step below
is done, someone has to trigger a build for a change to appear.

### The one thing still to wire up

This needs the Vercel project to exist, so it is a deployment task rather than a
code one:

1. In Vercel, open the project, then **Settings → Git → Deploy Hooks**. Create
   one called `sanity-publish` on the production branch. Vercel gives you a URL.
2. In Sanity, open **manage.sanity.io**, then the project, then **API →
   Webhooks**. Create a webhook:
   - **URL** — the deploy hook URL from step 1
   - **Dataset** — `production`
   - **Trigger on** — Create, Update, Delete
   - **Filter** — `_type in ["page", "service", "post", "category", "tag", "author", "siteSettings", "faq", "testimonial", "teamMember", "form", "redirect"]`
   - **HTTP method** — `POST`
3. Publish something and check a deployment starts.

The filter matters. Without it, a webhook fires on every document change
including each form submission, so every enquiry would trigger a rebuild of the
whole site. `submission` is deliberately absent from that list for that reason.

### Scheduled publishing

Spec §18 asks for it. Sanity provides it as **Content Releases**, which is a paid
feature on their plans — it is not something that can be built around, so it
needs a decision about the plan rather than a code change. Everything else in
that section (drafts, preview, publish, unpublish) works today.
