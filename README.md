# Anchor Consultants

A ground-up rebuild of the Anchor Consultants website in Astro, Tailwind and
GSAP, replacing a WordPress build. No WordPress, plugin or theme code was
carried over; the original was used as a visual and functional reference only.

`MIGRATION.md` is the full record: the audit of the original, a 28-item defect
register, every measurement taken, and what was decided and why. Read it before
changing anything that looks arbitrary — most of the odd-looking numbers in this
codebase were measured off the live site.

---

## Quick start

```bash
npm install
npm run dev
```

The dev server runs on <http://localhost:4321>.

| Command                | What it does                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                                                                                                                                        |
| `npm run build`        | Static build to `dist/`                                                                                                                                                           |
| `npm run preview`      | Serve the build with gzip and production caching. Not `astro preview`: the Vercel adapter has none, and an uncompressed server gave misleading Lighthouse numbers (milestone 14). |
| `npm run check`        | `astro check` — types and templates                                                                                                                                               |
| `npm test`             | Unit tests (Node's built-in runner)                                                                                                                                               |
| `npm run format`       | Prettier across the repo                                                                                                                                                          |
| `npm run format:check` | Verify formatting without writing                                                                                                                                                 |

---

## What still needs doing before launch

These are the only things standing between this build and production. Each is
blocked on information rather than code.

1. **Privacy policy text.** `/privacy-policy/` is an honest holding page. The
   WordPress original was unedited WordPress boilerplate that still named the
   theme author's demo domain as the site owner, so it was not carried over and
   nothing was invented to replace it. The page is `noindex` and excluded from
   the sitemap until real text lands. Needs legal review.
2. **SMTP and reCAPTCHA credentials.** Both integrations are fully implemented
   and verified; they are inert until the environment variables exist. See
   [Environment](#environment).
3. **Production domain.** `SITE_URL` in `src/data/site-url.mjs` is a
   placeholder, and `IS_PRODUCTION_HOST` in the same file gates all indexing.
   See [Going live](#going-live).
4. **Confirm the phone number.** `src/data/site.ts` uses `+971 56 192 4606`.
   The original printed a version missing a digit in one place.
5. **Real blog content.** Both posts are the WordPress placeholders, ported
   verbatim. One is literal keyboard mash.
6. **Cross-browser and screen-reader testing.** Chrome is covered by Lighthouse.
   Safari, Firefox, iOS Safari and a screen-reader pass need a human.

---

## Environment

Copy `.env.example` to `.env` and fill in what you have. Every variable is
optional; with none set, the site builds and both forms work end to end, and
report honestly that nothing was delivered.

### Mail

Delivery switches on when `SMTP_HOST`, `SMTP_USER` and `SMTP_PASSWORD` are all
present. Until then submissions are validated, logged to the server console,
and the visitor is told plainly that the message was not sent. **The forms
never claim to have sent something they did not.**

The visitor's own address goes in `Reply-To`, never in `From` — sending as them
fails SPF and DMARC on most providers.

### reCAPTCHA v3

Set both `PUBLIC_RECAPTCHA_SITE_KEY` and `RECAPTCHA_SECRET_KEY`, or neither. A
secret with no site key rejects every submission for a missing token.

The reCAPTCHA script is loaded lazily, on the first submit that needs a token,
rather than on every page. It is roughly 100 KB of third-party JavaScript; most
visitors never trigger it.

---

## Going live

1. Set `SITE_URL` in `src/data/site-url.mjs` to the production domain.
2. Set `IS_PRODUCTION_HOST` to `true` **only for production builds.**

That second flag is the single switch controlling indexing. When false, every
page emits `noindex, nofollow` and `robots.txt` disallows everything. The
WordPress staging site was `noindex` sitewide and shipping that to production
would be a serious regression, so this is deliberately explicit rather than
inferred.

Verify after deploying:

```bash
curl https://your-domain/robots.txt
curl -s https://your-domain/ | grep 'name="robots"'
```

Production should show `Allow: /` plus a `Sitemap:` line, and
`index, follow, max-image-preview:large, max-snippet:-1`.

### Hosting

The site is static apart from one server route, `src/pages/api/contact.ts`,
which reCAPTCHA requires (the v3 token must be verified server-side).

`@astrojs/node` in standalone mode is configured, so `npm run build` produces
`dist/client` (static) and `dist/server` (the endpoint), and it runs on any
Node host. Moving to Vercel or Netlify is the single `adapter:` line in
`astro.config.mjs`.

Whatever the host, make sure it serves **gzip or brotli**. Every mainstream host
does by default. The stylesheet is 44 KB raw and 9 KB compressed, and the
difference is worth 8 Lighthouse performance points.

---

## Architecture

```
src/
  assets/images/     Local, optimised. No remote assets anywhere, by design.
  components/
    blog/ home/ layout/ modals/ shared/ ui/
  content/           Markdown collections — services, posts, faqs,
                     testimonials, team
  data/
    site.ts          Contact details, nav, CTAs. Single source of truth.
    site-url.mjs     SITE_URL and IS_PRODUCTION_HOST
  layouts/           BaseLayout (head, SEO, skip link) and PageLayout
  lib/
    animations.ts    GSAP entry point — homepage only
    emi.ts           EMI maths (unit-tested)
    forms.ts         Validation shared by client and server
    recaptcha.ts     Lazy v3 token helper
    reveal.ts        IntersectionObserver reveals (unit-tested)
    seo.ts           Titles, canonicals, JSON-LD
  pages/             Routes, including api/contact.ts and robots.txt.ts
  styles/global.css  Design tokens measured from the original
```

### Conventions worth knowing

- **Content never lives in markup.** It goes in `src/content/` or
  `src/data/site.ts`, which is what makes the planned Sanity migration a loader
  swap rather than a rewrite.
- **Styling is Tailwind against the tokens in `global.css`.** Add a token
  rather than a one-off hex. The colour, type-scale and breakpoint values were
  measured from the live site; do not tidy them.
- **Breakpoints match Bootstrap 5** (576 / 768 / 992 / 1200 / 1400) because the
  source theme was Bootstrap-based. 992px is where the mobile nav activates.
  `.container-bs` reproduces Bootstrap's container max-widths.
- **Avoid fixed pixel grid tracks at a breakpoint.** `lg:grid-cols-[660px_640px]`
  looks right at 1440 and overflows at 1024. This bug was fixed twice; use
  percentages of the container instead.
- **Animation goes through `lib/animations.ts` or `lib/reveal.ts`,** animates
  only `transform` and `opacity`, and must respect `prefers-reduced-motion`.
  There is a global reduced-motion guard in `global.css` as a backstop.
- **Scroll reveals must degrade safely.** The base state is visible; the hidden
  start state applies only under `.js`. Content must never be lost if
  JavaScript fails.
- **Accessibility is not a later pass.** Real labels, correct input types,
  `aria-expanded` on disclosures, visible focus, one `<h1>` per page,
  sequential headings.
- **Every page passes a hand-written `description`** of 120–160 characters.
  Never auto-generate one from body text.

---

## Testing

```bash
npm test          # 25 unit tests
npm run check     # types and templates
npm run build     # must complete clean
```

The EMI calculator and the reveal system are unit-tested. The reveal tests
exist because the browser preview used during the rebuild never delivered
`IntersectionObserver` callbacks, so that path could not be verified in a
browser; the tests drive both the observer and the scroll-sweep fallback
directly.

### Performance checks

`scripts/serve-compressed.mjs` serves `dist/client` with gzip and
production-like cache headers, which is what you want for a realistic
Lighthouse run — `astro preview` serves uncompressed and understates the score
by about eight points.

```bash
npm run build
node scripts/serve-compressed.mjs 4330
npx lighthouse http://localhost:4330/ --view
```

Last measured: performance 93 on the homepage, 99–100 everywhere else,
accessibility 100, best practices 100, SEO 100. Heaviest page is 194 KB.

---

## Things that will look odd until you read MIGRATION.md

- Colour tokens are a few values darker than the original (`#717171`, not
  `#777777`). The originals failed WCAG AA contrast; these pass and are
  visually indistinguishable.
- The 404 copy differs from the original, which read "We will get back to you
  as soon as possible." on a missing page.
- `/blog/` sidebar links use query parameters (`?category=`, `?month=`) that the
  index filters client-side. The original pointed at WordPress routes a static
  build has no equivalent for.
- The post template has no comment form. A static build has nowhere to store
  comments, and a form that silently discarded input would be worse than none.
- Blog posts are placeholders. That is the client's content, ported as-is.
