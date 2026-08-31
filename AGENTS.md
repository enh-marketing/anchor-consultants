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
npm run preview  # serve the build
npm run check    # astro check (types + templates)
```

## Environment

`SITE_URL` and `IS_PRODUCTION_HOST` live in `src/data/site-url.mjs`.
`IS_PRODUCTION_HOST` gates indexing: anything other than a production build
emits `noindex, nofollow`. The WordPress staging site is `noindex` sitewide,
and shipping that to production would be a serious regression.

## Not yet wired

- SMTP credentials and reCAPTCHA v3 keys (client to supply). The form endpoint
  at `src/pages/api/contact.ts` is the only place they belong.
- Sanity CMS. Content collections are shaped to match the planned document
  types; see `MIGRATION.md` section H.3.
- Production domain. `SITE_URL` is a placeholder.
