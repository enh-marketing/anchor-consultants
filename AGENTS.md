# Anchor Consultants — Astro rebuild

A ground-up rebuild of the WordPress site at https://anchor.enhdemo.com/ using
Astro, Tailwind and GSAP. The WordPress site is a **visual and functional
reference only**. See `MIGRATION.md` for the full audit, the defect register
and the milestone checklist.

## Hard rules

- **Never copy WordPress or plugin CSS, JS, PHP or markup.** Recreate behaviour
  from scratch. The original runs jQuery, Bootstrap, Swiper (twice), Isotope,
  Font Awesome and Chart.js; none of that belongs here.
- **No remote assets, with one sanctioned exception.** `astro.config.mjs` sets
  empty `domains`/`remotePatterns` deliberately: the WordPress build hotlinked
  the theme author's demo server, and that must never reappear. The exception is
  `cdn.sanity.io`, once a collection is served from Sanity — CMS-managed imagery
  has to come from the CMS. It goes through `src/components/ui/CmsImage.astro`
  and Sanity's URL builder, never a bare `<img>`, so `srcset`, `sizes` and WebP
  survive. Decorative and theme imagery stays in `src/assets/`.
- **No new dependencies** without a clear reason. Astro, Tailwind, TypeScript
  and GSAP cover almost everything.
- **Content never lives in markup.** It goes in `src/content/` collections or
  `src/data/site.ts`, so the later Sanity migration is a loader swap.
- **Sections are blocks.** A page's sections come from a `page` document's
  `sections[]` array, rendered by
  `src/components/sections/SectionRenderer.astro`. Block types are declared once
  in `studio/schemaTypes/blocks/` and typed in `src/lib/sections.ts`. Two rules
  hold: **a block models content, never presentation** (no colour, size or
  margin fields; variation goes through a named variant the component
  translates), and **every field is optional**, so a section falls back to the
  values it shipped with rather than blanking.

## Conventions

- **Styling** is Tailwind utilities against the tokens in
  `src/styles/global.css`. Add a token rather than a one-off hex. Colour,
  type-scale and breakpoint values were measured from the live site; do not
  change them to "tidy" values.
- **Breakpoints** match Bootstrap 5 (`576 / 768 / 992 / 1200 / 1400`) because
  the source theme is Bootstrap-based. **992px** is the primary switch where
  the mobile nav activates.
- **Containers** use `.container-bs`, which reproduces Bootstrap's max-widths.
- **Components** are `.astro` unless they genuinely need client JS. Prefer zero
  JS; reach for a small inline script before a framework.
- **Animation** goes through `src/lib/animations.ts`. Animate only `transform`
  and `opacity`. Every effect must respect `prefers-reduced-motion`.
- **Scroll reveals** must degrade safely: the base state is visible, and the
  hidden start state applies only under `.js`. Content must never be lost if
  JavaScript fails. The WordPress build gets this wrong.
- **Accessibility** is not a later pass. Real `<label>`s, correct input types,
  `aria-expanded` on disclosure widgets, visible focus, one `<h1>` per page,
  sequential heading levels.
- **SEO** comes from `src/lib/seo.ts`. Every page passes a hand-written
  `description`. Never auto-generate one from body text.

## Commands

```bash
npm run dev      # dev server on :4321
npm run build    # static build to dist/
npm run preview  # serve the build with gzip, as deployed
npm run check    # astro check (types + templates)
```

## Environment

`SITE_URL` and `IS_PRODUCTION_HOST` are derived in `src/data/site-url.mjs` from
the environment, not committed. On Vercel both come from Vercel's own variables:
the origin from `VERCEL_PROJECT_PRODUCTION_URL` (the connected domain) and
indexing from `VERCEL_ENV === 'production'`. Connecting the domain is the only
step; `PUBLIC_SITE_URL` and `SITE_INDEXABLE` are overrides for another host.

The default is the safe one. A build that cannot prove it is a production
deployment emits `noindex, nofollow`, so preview deployments and local builds are
never indexable. The WordPress staging site is `noindex` sitewide and shipping
that to production would be a serious regression (defect #21) — and so would a
staging deployment quietly indexing itself, which a committed flag could not
prevent.

## Not yet wired

Everything here is a value or a decision the client owes, not unfinished code.
Each one degrades loudly rather than silently: the build warns, and the affected
feature says plainly that it is unconfigured.

- **Credentials, all of them.** SMTP, reCAPTCHA v3, and the Sanity write and
  preview tokens, plus `SUBMISSION_SALT`. See `.env.example`; they belong in the
  deployment environment and nowhere else. Without them: forms validate but do
  not send, submissions are not archived, rate limiting is off, and preview
  answers 503.
- **Deploy webhook.** Needs the Vercel project to exist. Until it is wired, a
  publish in the Studio needs a manual build. Steps are in `SANITY.md`.
- **Production domain.** Connect it in the Vercel dashboard and both the
  canonical origin and indexing follow automatically. Until a production
  deployment exists, every build emits `noindex, nofollow`, which is the correct
  default rather than something to fix.
- **Content the client owes.** Privacy policy text, real blog posts, the redirect
  list, and confirmation of the phone number (audit Q10).
- **A retention window** for stored enquiries. `prune-submissions.mjs` refuses to
  run without one on purpose.

Sanity itself is connected and is the source of truth for every page, the global
settings, the blog, forms, redirects and SEO. `CMS-AUDIT.md` lists what is
editable and the thirteen things deliberately left in code.
