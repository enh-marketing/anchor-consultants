# Anchor Consultants — WordPress to Astro Migration Plan

**Reference site:** https://anchor.enhdemo.com/ (staging, WordPress)
**Target:** Astro + Tailwind CSS + GSAP + TypeScript, fully static output, all assets local
**Audit date:** 28 August 2026
**Last updated:** 28 August 2026, after permalink reset and client decisions on Q1/Q3
**Status:** Audit complete. Awaiting approval before implementation.

### Decisions locked

| Ref | Decision                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1  | **Restore the page title and breadcrumb** in the inner page banner. This also resolves defects #2 and #3.                                         |
| Q3  | **Show all three calculator outputs** (Loan EMI, Total Interest Payable, Total Payment) and **extend the months slider to 360**.                  |
| —   | Permalinks were reset in WordPress on 28 Aug 2026. **Defect #1 is resolved at source**: all `service` and `portfolio` detail URLs now return 200. |

---

## A. Website Audit

### A.1 What the site actually is

The staging site runs the commercial **Finaxio** WordPress theme (v2.0.1) with its full demo content still installed. A subset of pages has been customised for Anchor Consultants, a UAE mortgage and real-estate finance advisory. The rest is untouched theme boilerplate.

The `lastmod` dates separate the two cleanly and this drove the scoping decision:

| Signal                                        | Meaning                                |
| --------------------------------------------- | -------------------------------------- |
| Modified 2026-02-23 / 2026-03-27              | Real Anchor content, actively edited   |
| Modified 2025-12-29                           | Bulk theme demo import                 |
| Modified 2023-08-09 / 2023-08-16 / 2025-04-02 | WordPress defaults and older leftovers |

This is corroborated by the live navigation, which links to only six destinations, and by the homepage, which links to nothing outside that set.

### A.2 Platform and plugin stack (all to be discarded)

| Component                     | Role on the site                | Replacement approach                     |
| ----------------------------- | ------------------------------- | ---------------------------------------- |
| Finaxio theme + finaxio-child | Layout, styling, JS             | Rebuild in Astro + Tailwind              |
| finaxio-toolkit               | Theme widgets/elements          | Rebuild as Astro components              |
| Elementor + Elementor AI      | Page builder for all main pages | Static Astro components                  |
| emi-calculator                | EMI calculator widget           | Rebuild from scratch in TypeScript       |
| html-forms                    | Contact + CV forms              | Astro form + server endpoint             |
| popup-maker                   | Two modals                      | Custom dialog component                  |
| testimonial-free              | Testimonial carousel            | Custom carousel                          |
| click-to-chat-for-whatsapp    | Floating WhatsApp button        | Simple anchor + SVG                      |
| All in One SEO v5.0.1         | Meta tags, sitemap, schema      | Astro SEO component + `@astrojs/sitemap` |
| LiteSpeed Cache               | Caching                         | Not needed (static)                      |
| Google Site Kit               | Analytics wiring                | Optional, to be confirmed                |

Front-end libraries currently loaded: jQuery 3.7.1, jQuery Migrate, Bootstrap 5, Swiper (two separate copies), Isotope, Waypoints, counterUp, Magnific Popup, MeanMenu, progressbar.js, rangeslider.js, Chart.js, animate.css. **No GSAP.**

### A.3 Performance baseline (homepage, uncached)

| Metric         | Current            |
| -------------- | ------------------ |
| Total transfer | ~3.30 MB           |
| HTML document  | 168 KB             |
| Sub-resources  | 80 files, ~3.13 MB |
| Requests       | 93                 |
| TTFB           | ~1.47 s            |
| Load event     | ~1.95 s            |

Largest offenders:

- `all.css` (Font Awesome) 220 KB
- `chart.js` 199 KB — **loaded on every page and never used; there is no `<canvas>` anywhere**
- `style.css` (theme) 196 KB
- Hero PNGs `banner-1/2/3.png` 194 + 188 + 159 KB = 541 KB for three slides
- `swiper.min.js` (testimonial plugin) 163 KB **plus** `swiper-bundle.min.js` (theme) 133 KB — two copies of the same library
- `bootstrap.min.css` 160 KB
- WordPress block-editor CSS 121 KB + components CSS 106 KB — editor CSS shipped to visitors
- jQuery 85 KB, animate.css 58 KB

Realistic Astro target: **under 500 KB** on the homepage with near-zero JS on static pages.

### A.4 Defects found on the live site

These are real problems in the current build. Recommended handling is noted; all are cheap to fix correctly in the rebuild.

| #   | Severity                    | Defect                                                                                                                                                                                                                                                                                                                                               | Recommended action                                                                                                  |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~High~~ **RESOLVED**       | ~~All `service` and `portfolio` detail URLs return 404.~~ Permalinks were reset on 28 Aug 2026. All service and portfolio URLs now return 200 and the homepage "Read More" links resolve.                                                                                                                                                            | Done at source. Service detail template now audited — see section B.4.                                              |
| 2   | ~~High~~ **RESOLVED (m08)** | **Inner page banners are broken on every page.** `.page__banner-content` is `display:none`, so the H1 and breadcrumb are hidden, and the background image is referenced over `http://` so browsers block it as mixed content. Result: a 226px empty grey band on About, Services, Testimonials, Contact, Blog **and all four service detail pages**. | **Decided (Q1): restore the title and breadcrumb**, serve the image over https.                                     |
| 3   | ~~High~~ **RESOLVED (m08)** | **No visible H1 on any inner page** (direct consequence of #2). Note `mortgage-solutions` has no H1 in the markup at all, while the other three do.                                                                                                                                                                                                  | Resolved by the Q1 decision. Add the missing title for Mortgage Solutions.                                          |
| 4   | High                        | **Three different phone numbers.** Topbar `+971561924606`, contact page `+97156192460` (missing final digit), footer `+971 - 561924606`. All `tel:` hrefs are malformed as `tel:+971%20-%20561924606`.                                                                                                                                               | Confirm the correct number, then use one canonical value with a clean `tel:+971561924606`.                          |
| 5   | High                        | **Header logo, hero slides, service icons, about and FAQ images are hotlinked from the theme author's demo server** `finaxio.nextwpcook.com`. The site breaks if that server goes away or blocks hotlinking. Also a licensing exposure.                                                                                                              | Download locally. Flag the stock photography for licence review — see Open Questions Q4.                            |
| 6   | Medium                      | `Discover More` on the homepage points to `/~anchor/about/`, a leftover subdirectory install path.                                                                                                                                                                                                                                                   | Point to `/about/`.                                                                                                 |
| 7   | ~~Medium~~ **RESOLVED**     | Footer `Privacy Policy` links to `#`. A privacy page exists at `/privacy-policy-2/` but is unlinked.                                                                                                                                                                                                                                                 | **RESOLVED (m11).** `/privacy-policy/` built and linked. The WordPress page is _not_ carried over — see Q15.        |
| 8   | Medium                      | Footer `FAQ` links to `/faq`, which is an unstyled theme demo page.                                                                                                                                                                                                                                                                                  | Link to the homepage FAQ section or build a real FAQ page.                                                          |
| 9   | ~~Medium~~ **RESOLVED**     | **Blog sidebar has duplicate widgets** — Recent Posts appears twice (`block-3` and `csf_recent_post_widget-1`), Archives twice (`block-5`, `block-7`), and there are two search forms.                                                                                                                                                               | **RESOLVED (m11).** One search, one Recent Posts, one Archives, one Categories.                                     |
| 10  | Medium                      | EMI calculator: the **months tenure slider maxes at 30 months**, while the years slider goes to 30 years.                                                                                                                                                                                                                                            | **Decided (Q3): extend to 360 months.**                                                                             |
| 11  | Medium                      | EMI calculator hides **Total Interest Payable** and **Total Payment**, though both are computed correctly. Chart.js is loaded for a chart that does not exist.                                                                                                                                                                                       | **Decided (Q3): show all three outputs.** Chart.js still dropped.                                                   |
| 12  | Low                         | Number formatting inconsistent in the calculator: `21370 AED` vs `71,370 AED`.                                                                                                                                                                                                                                                                       | Consistent thousands separators.                                                                                    |
| 13  | Low                         | Five images carry the literal alt text `"No alt text"`. Thirteen have empty alt.                                                                                                                                                                                                                                                                     | Write real alt text.                                                                                                |
| 14  | Low                         | Heading hierarchy is broken: 6 `<h1>` elements (5 visible) on the homepage, and jumps from H2 straight to H4/H5/H6.                                                                                                                                                                                                                                  | One H1 per page, sequential levels.                                                                                 |
| 15  | Low                         | 16 form inputs have no associated `<label>`; placeholders are used as labels. Email and phone fields use `type="text"`.                                                                                                                                                                                                                              | Real labels, correct input types.                                                                                   |
| 16  | Low                         | No `aria-expanded` anywhere. The FAQ accordion and mobile menu are not announced to screen readers.                                                                                                                                                                                                                                                  | Proper ARIA state.                                                                                                  |
| 17  | Low                         | No skip-to-content link.                                                                                                                                                                                                                                                                                                                             | Add one.                                                                                                            |
| 18  | Low                         | Typo in body copy: `"Call us 24/7. We can answer for all your questions.b"` (trailing `b`).                                                                                                                                                                                                                                                          | Fix.                                                                                                                |
| 19  | Low                         | Service slug typo: `commercial-finanaces`.                                                                                                                                                                                                                                                                                                           | See Open Questions Q2.                                                                                              |
| 20  | Low                         | Leftover demo contacts in hidden markup: `tel:123456789`, `mailto:info@webmail.com`. Hidden social links point to bare `http://x.com` and `http://youtube.com`.                                                                                                                                                                                      | Omit, or wire to real profiles.                                                                                     |
| 21  | Info                        | Every page is `noindex, nofollow`. Correct for staging, but must not ship to production.                                                                                                                                                                                                                                                             | Make robots policy environment-driven.                                                                              |
| 22  | Info                        | No hand-written meta descriptions. All are auto-scraped by AIOSEO, producing text like `"No testimonials found"` and the gibberish body of the dummy post.                                                                                                                                                                                           | Write real descriptions for all pages.                                                                              |
| 23  | Medium                      | **All four service detail pages use the identical hero photo** (`service-1.jpg`) and the identical three card icons (`services-4/5/6.png`). Only the labels and body copy differ.                                                                                                                                                                    | Content gap, not a build problem. Template will support per-service imagery so it is a content edit later. See Q11. |
| 24  | Medium                      | **Service detail pages are structurally inconsistent.** Three have three feature cards plus a checklist; Lease Rental Discounting has neither and is two sentences long.                                                                                                                                                                             | Build one flexible template where cards and checklist are optional.                                                 |
| 25  | Low                         | White gap renders below the copyright bar on short service pages; the footer does not fill the viewport.                                                                                                                                                                                                                                             | Sticky footer via flex layout.                                                                                      |
| 26  | Medium                      | **Copyright bar text is effectively unreadable.** The bar is `#1E1F21` with credit text `#0E6C90` and FAQ / Privacy links `#084876`, measuring **1.73:1** against the 4.5:1 WCAG AA minimum.                                                                                                                                                         | Fixed in milestone 02: same blue hue lifted to 6.5:1.                                                               |
| 28  | Low                         | **404 subhead is the wrong copy.** The error page reads "We will get back to you as soon as possible.", which belongs on a form confirmation, not a missing page. Found in milestone 11.                                                                                                                                                             | Layout reproduced exactly; copy rewritten to explain the error and offer a route onward.                            |

### A.5 Dead markup in the DOM

Present in the HTML but `display:none`. A naive HTML-to-Astro scrape would faithfully rebuild all of it. **None of this should be carried over:**

- Homepage "Company Blog & Insights" section
- Two "Contact Us Free" CTA blocks (with the placeholder phone/email above)
- An entire second footer variant with "News & Feeds", "Connect with us" and "Social Network:"
- About page: `Who We Are` H1, counters ("Projects Managed", "Satisfied Clients Worldwide"), "Implement solutions & Achieve goals", and a four-step "How We Started Industry" timeline
- EMI calculator: Total Interest Payable and Total Payment rows
- A newsletter signup form (single email field)

---

## B. Page Inventory

### B.1 In scope — real pages (9 routes)

| #   | Route               | Source                 | Template       | Notes                                                 |
| --- | ------------------- | ---------------------- | -------------- | ----------------------------------------------------- |
| 1   | `/`                 | page ID 12 `home-one`  | Home           | 12 visible sections, 6239px tall at 1440w             |
| 2   | `/about/`           | page ID 23             | Inner          | Short page, 2541px                                    |
| 3   | `/services/`        | page ID 26             | Inner          | 4 service cards + skills section, 2256px              |
| 4   | `/testimonials/`    | page ID 118            | Inner          | 7 testimonials in a grid, 1658px                      |
| 5   | `/contact/`         | page ID 33             | Inner          | Map, contact info, form, 2413px                       |
| 6   | `/blog/`            | page ID 36 `blog-grid` | Blog index     | 2 posts + sidebar. **Route rename proposed** — see Q5 |
| 7   | `/blog/[slug]/`     | 2 posts                | Post           | Both posts are placeholder content                    |
| 8   | `/services/[slug]/` | 4 service CPT entries  | Service detail | **Currently 404. New pages.**                         |
| 9   | `/404`              | —                      | Error          | Currently a WordPress 404                             |

Plus non-page routes: `/sitemap.xml`, `/robots.txt`.

### B.2 Real services (4)

| Title                            | Current slug                         | Proposed slug                         |
| -------------------------------- | ------------------------------------ | ------------------------------------- |
| Mortgage Solutions               | `mortgage-solutions`                 | `mortgage-solutions`                  |
| Commercial Finances              | `commercial-finanaces`               | `commercial-finances` (typo fix, Q2)  |
| Construction & Developer Finance | `lrd-construction-developer-finance` | `construction-developer-finance` (Q2) |
| Lease Rental Discounting         | `lrd-section`                        | `lease-rental-discounting` (Q2)       |

All four have real body content in WordPress.

### B.3 Service detail template (audited after the permalink reset)

Now that these pages resolve, the template is confirmed. Structure, top to bottom:

1. `PageBanner` (currently the broken empty band; will carry title + breadcrumb per Q1)
2. Full-width hero image, roughly 1300 x 490
3. `Description:` heading, currently H4, with rich body copy using bold emphasis
4. Row of three icon feature cards (optional, see below)
5. Checklist with blue circular check icons (optional)
6. Footer. **No sidebar, no related services, no CTA.**

Per-service variation:

| Service                          | H1 in markup | Feature cards                                         | Checklist |
| -------------------------------- | ------------ | ----------------------------------------------------- | --------- |
| Mortgage Solutions               | **Missing**  | Loan Profiling, Rate Structuring, Funding Delivery    | 7 items   |
| Commercial Finances              | Yes          | Asset Evaluation, Capital Sourcing, Deal Execution    | Yes       |
| Construction & Developer Finance | Yes          | Escrow Strategy, Milestone Funding, Portfolio Scaling | Yes       |
| Lease Rental Discounting         | Yes          | **None**                                              | **None**  |

Implementation notes:

- One `[slug].astro` template with `features[]` and `checklist[]` as optional schema fields
- `heroImage` per service, defaulting to a shared fallback, so replacing the duplicated photo later is a content edit
- Promote the service title to H1 and demote `Description:` to H2, fixing the hierarchy
- Add a CTA at the end of the template (recommended, currently absent) — see Q12

### B.4 Explicitly out of scope (57 URLs)

Theme demo and WordPress defaults, none linked from the live navigation:

- **5 alternative demo homepages:** `home-one-dark`, `home-two-light`, `home-two-dark`, `home-three-light`, `home-three-dark`
- **7 celebrity demo team pages:** `elton-john`, `john-lennon`, `duncan-jones`, `johnny-depp`, `judas-iscariot`, `mick-jagger`, `trudie-styler`
- **11 demo services:** `advance-analytics`, `analysis-opportunities`, `banking-sector`, `business-security-solution`, `corporate-finance`, `digital-strategy`, `education-institute`, `financial-consultancy`, `find-your-new-curve`, `private-security`, `strategic-consulting-services`
- **10 demo portfolio items** + 4 portfolio category archives
- **8 `finaxio_builder` templates:** header-01/02/03, footer-01/02/03, offcanvas, price-item-monthly
- **Demo pages:** `project`, `team`, `faq`, `get-an-appointment`, `sample-page`, `sample-page-2`, `blog`, `privacy-policy-2`, `category/uncategorized`

Confirm this exclusion list before implementation (Q6).

---

## C. Component Inventory

### C.1 Global (used on every page)

| Component          | Detail                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| `TopBar`           | Navy `#084876`, 46px. Email + phone left, "Financing made simple" right. Wraps to 2 lines on mobile.      |
| `Header`           | White, 90px. Logo left, 6-item nav centre, "Lets Connect" button right. **Not sticky.**                   |
| `MobileNav`        | MeanMenu-style inline accordion that pushes content down. Activates below 992px. Not an offcanvas drawer. |
| `Footer`           | Navy. Logo + tagline + blurb, Quick Links, Contact Us with 2 buttons.                                     |
| `FooterDisclaimer` | Navy strip: "Financing is subject to bank policy, eligibility, and final approval."                       |
| `CopyrightBar`     | Dark `#1E1F21`, 66px. Credit line left, FAQ + Privacy Policy right.                                       |
| `WhatsAppButton`   | Fixed, bottom 85px / right 19px, z-index very high. Number `971561924606`.                                |
| `ScrollToTop`      | Fixed circular button, appears after scroll.                                                              |
| `ContactModal`     | Name, email, phone, message.                                                                              |
| `CvUploadModal`    | File upload, required.                                                                                    |

### C.2 Homepage sections (12 visible, in order)

| #   | Component             | Key detail                                                                                                                                          |
| --- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `HeroCarousel`        | 3 slides, Swiper fade, 6s autoplay, loop, 300ms. Eyebrow pill, H1 at 80px/700, paragraph, CTA.                                                      |
| 2   | `ServiceHighlightRow` | 3 tiles (Home Loan / Commercial Finance / Construction & Developer Finance), middle tile blue, photo backgrounds. 3s autoplay carousel below 992px. |
| 3   | `AboutSplit`          | Two overlapping images left, "Real-World Banking Experience" right, `Discover More` CTA.                                                            |
| 4   | `ServicesCarousel`    | "What We Offer for You". Swiper, 3 per view, loop, 4s autoplay, 1500ms. Background photo, elevated centre card.                                     |
| 5   | `EmiCalculator`       | See section D.3.                                                                                                                                    |
| 6   | `LeaderProfile`       | "Our Leader" — Samaira Nichani, Managing Director & Founder.                                                                                        |
| 7   | `AppointmentCta`      | "You can request an appointment to discuss your financing options."                                                                                 |
| 8   | `FaqAccordion`        | 6 items, first open. Two decorative images left.                                                                                                    |
| 9   | `TestimonialCarousel` | "User Feedback". 5 shown, 3 per view, loop, 3s autoplay, 600ms, arrows + dots.                                                                      |
| 10  | `Footer` group        | As above.                                                                                                                                           |

### C.3 Inner page components

| Component         | Used on                                                                                                                                                   |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageBanner`      | All inner pages (currently broken, see defect #2)                                                                                                         |
| `ServiceCard`     | Services page — icon, title, "Read More →"                                                                                                                |
| `SkillBars`       | Services — "Strategy is at the Heart of Growth", Financial Advisory 92%, Market Analysis 88%, animated (the 63/60 first recorded were read mid-animation) |
| `TestimonialGrid` | Testimonials page — 7 items                                                                                                                               |
| `ContactInfoList` | Contact — 3 rows with right-aligned icons                                                                                                                 |
| `ContactForm`     | Contact — Full Name, Email, Phone, Question, Submit Now                                                                                                   |
| `GoogleMap`       | Contact — iframe, 1300x535, lazy                                                                                                                          |
| `PostCard`        | Blog index                                                                                                                                                |
| `BlogSidebar`     | Search, Recent Posts, Recent Comments, Archives, Categories                                                                                               |

---

## D. Functionality Inventory

### D.1 Interactive features to rebuild

| Feature                    | Current implementation                  | Rebuild approach                                        |
| -------------------------- | --------------------------------------- | ------------------------------------------------------- |
| Hero carousel              | Swiper, fade, 6s, loop                  | GSAP crossfade + custom logic, or a small custom slider |
| Service highlight carousel | Swiper, 3s, 3/view, no loop             | Custom, CSS scroll-snap below 992px                     |
| Services carousel          | Swiper, 4s, 3/view, loop, arrows        | Custom carousel component                               |
| Testimonial carousel       | Swiper, 3s, 3/view, loop, arrows + dots | Same component, different data                          |
| FAQ accordion              | Bootstrap collapse                      | Native `<details>` or custom with proper ARIA           |
| Mobile navigation          | MeanMenu                                | Custom, matching push-down behaviour                    |
| EMI calculator             | emi-calculator plugin                   | TypeScript, see D.3                                     |
| Contact form               | html-forms                              | Astro form + `/api/contact` endpoint                    |
| CV upload form             | html-forms + Popup Maker                | Same endpoint, multipart                                |
| Contact modal              | Popup Maker                             | Native `<dialog>`                                       |
| CV modal                   | Popup Maker                             | Native `<dialog>`                                       |
| Scroll-to-top              | Theme JS                                | Small script + GSAP                                     |
| WhatsApp button            | Plugin                                  | Static anchor                                           |
| Skill/progress bars        | progressbar.js + Waypoints              | GSAP ScrollTrigger                                      |
| Blog search                | WordPress search                        | Client-side filter over 2 posts, or omit (Q7)           |
| Smooth scroll              | `scroll-behavior: smooth`               | Same, plus reduced-motion guard                         |

### D.2 Forms

Three forms exist. All currently post through the html-forms plugin with a honeypot field (`_hf_hXXX`).

**Contact form** (contact page and modal): `name` (required), `email` (required), `number` (required), `message` (optional).
**CV upload** (modal): single required file input.
**Newsletter**: single email field, currently hidden — omit unless wanted.

Rebuild plan:

- Real `<label>` for every field, `type="email"` and `type="tel"` where correct
- Client-side validation with inline errors and an `aria-live` region
- Honeypot retained
- reCAPTCHA v3 executed on submit, token posted to the server
- Single server endpoint `/api/contact` verifies the token with Google, then sends via SMTP
- CV upload: restrict to PDF/DOC/DOCX, enforce a size cap, validate server-side

**This requires one server route.** Everything else prerenders to static. Astro `output: 'static'` with `prerender = false` on that one endpoint.

### D.3 EMI calculator specification

The most complex custom feature. Exact current parameters:

| Control              | Type           | Min   | Max        | Default | Unit |
| -------------------- | -------------- | ----- | ---------- | ------- | ---- |
| Loan Amount          | number + range | 5,000 | 10,000,000 | 50,000  | AED  |
| Interest Rate        | number + range | 1     | 30         | 15      | %    |
| Loan Tenure (years)  | number + range | 1     | 30         | 5       | Yr   |
| Loan Tenure (months) | number + range | 6     | **30**     | 6       | Mo   |

Yr/Mo is a radio pair (`emi_months_years`) that swaps which slider is active.

Formula (standard amortisation), verified against the live output:

```
r = annualRate / 12 / 100
n = tenure in months
EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
```

Verification: P=50,000, rate=15%, n=60 gives EMI = **1,189.4965**, total payment 71,370, total interest 21,370 — exactly the figures the live site displays. **Corrected 28 Aug 2026:** this line previously read 1,189.35 / 71,361 / 21,361 and claimed the original derived its totals from a rounded instalment. That was my own arithmetic error, caught by the unit tests in milestone 06. The original's maths is correct; only its presentation (hidden rows, inconsistent separators) needed fixing.

Outputs: **Loan EMI** (shown), **Total Interest Payable** (hidden), **Total Payment** (hidden).

Rebuild notes: number and slider stay in sync both ways, debounced recalculation, `Intl.NumberFormat('en-AE')` for consistent formatting, full keyboard support, ARIA on the sliders. The 30-month cap and the hidden rows need a decision (Q3).

---

## E. Asset Inventory

All assets must be downloaded and served locally. 42 unique assets are referenced by the live pages.

### E.1 Hotlinked from the theme demo server (must be localised)

Source: `https://finaxio.nextwpcook.com/wp-content/uploads/2023/08/`

| File             | Size   | Used for          |
| ---------------- | ------ | ----------------- |
| `logo.png`       | 15 KB  | Header logo       |
| `banner-1.png`   | 194 KB | Hero slide 1      |
| `banner-2.png`   | 188 KB | Hero slide 2      |
| `banner-3.png`   | 159 KB | Hero slide 3      |
| `about-1.jpg`    | 27 KB  | About split image |
| `about-2.jpg`    | 34 KB  | About split image |
| `services-7.png` | 14 KB  | Service icon      |
| `services-8.png` | 11 KB  | Service icon      |
| `services-9.png` | 4 KB   | Service icon      |
| `faq-3.jpg`      | 34 KB  | FAQ decorative    |
| `faq-4.jpg`      | 13 KB  | FAQ decorative    |

All return 200 and are downloadable.

### E.2 Hosted on the Anchor server

| File                                                                                                     | Size   | Used for                               |
| -------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------- |
| `2025/12/anchor_consultants.png`                                                                         | 63 KB  | Real Anchor logo, og:image             |
| `2026/01/pp23-removebg-preview.png`                                                                      | 161 KB | Samaira Nichani portrait               |
| `2026/01/ms-removebg-preview.png`                                                                        | —      | Mortgage Solutions icon                |
| `2026/01/cf-removebg-preview.png`                                                                        | —      | Commercial Finances icon               |
| `2026/01/Untitled_design-removebg-preview.png`                                                           | —      | Construction icon                      |
| `2026/01/Untitled_design__1_-removebg-preview.png`                                                       | —      | LRD icon                               |
| `2026/02/1.webp`, `2.jpg`, `3.webp`, `4.webp`                                                            | —      | Inner page banners (currently blocked) |
| `2023/08/history-two.jpg`                                                                                | 44 KB  | Blog featured image                    |
| `2023/08/about.jpg`, `about-1.jpg`, `plan.jpg`, `arrow.png`, `call.png`, `banner-bg.jpg`, `services.jpg` | —      | Section backgrounds and decorations    |
| `2023/08/history-one/three/four.jpg`                                                                     | —      | About timeline (hidden)                |
| `2023/08/favicon-2.png`                                                                                  | —      | Favicon                                |

### E.3 Fonts

**DM Sans only.** Confirmed by computed styles: 536 elements use DM Sans, 3 use Arial as a fallback artifact. Roboto and Roboto Slab are registered by Elementor but never applied. Weights in use: 400, 500, 600, 700.

Plan: self-host DM Sans as woff2 via `@fontsource-variable/dm-sans`. No Google Fonts network dependency.

### E.4 Icons

Currently Font Awesome (220 KB) plus a custom `flaticon` font, for roughly a dozen icons. Plan: inline SVG only. Saves ~250 KB.

### E.5 Optimisation plan

- Convert hero PNGs to AVIF/WebP with fallbacks. The three hero images alone should drop from 541 KB to well under 100 KB.
- Use Astro `<Image>` for responsive `srcset`, width/height, and lazy loading below the fold.
- Preload the LCP hero image; eager-load only slide 1.
- Keep the aspect ratios and crops of the originals unchanged.

---

## F. Design Analysis

### F.1 Colour tokens (from computed styles)

| Token           | Value                             | Usage                                    |
| --------------- | --------------------------------- | ---------------------------------------- |
| `primary`       | `#084876`                         | Topbar, footer, buttons, headings accent |
| `primary-light` | `#2A78C0`                         | Secondary blue, middle highlight tile    |
| `accent`        | `#0E6C90`                         | Occasional accent                        |
| `accent-alt`    | `#1595CE`                         | Occasional accent                        |
| `ink`           | `#1C1E22`                         | Headings                                 |
| `ink-soft`      | `#333333`                         | Strong body text                         |
| `body`          | `#777777`                         | Default body text (363 elements)         |
| `surface`       | `#FFFFFF`                         | Cards, header                            |
| `surface-alt`   | `#F7F7F7`                         | Alternating section background           |
| `dark`          | `#1E1F21`                         | Copyright bar                            |
| `border`        | `#E6E6E6` / `#D6D6D6` / `#CCCCCC` | Dividers                                 |
| `warning`       | `#EC1113`                         | Single error/red usage                   |

Service icons use an orange/amber family that needs sampling from the source SVG/PNG during implementation.

### F.2 Typography

Single family: **DM Sans**. Body 16px / 26px line-height (1.625).

| Role        | Size / Weight          | Notes                                    |
| ----------- | ---------------------- | ---------------------------------------- |
| Hero H1     | 80px / 700             | Desktop                                  |
| Section H2  | 60px / 700             | "What We Offer for You", "User Feedback" |
| Sub-heading | 30px / 700             |                                          |
| Card title  | 24px / 700             |                                          |
| Body        | 16px / 400             | Dominant (398 elements)                  |
| Body medium | 16px / 500             |                                          |
| Body bold   | 16px / 700             |                                          |
| Large body  | 18px / 400             |                                          |
| Small       | 15px / 700, 14px / 400 | Meta, labels                             |

### F.3 Layout and spacing

- Bootstrap 5 grid. Container max-widths follow Bootstrap defaults; to be confirmed per breakpoint during implementation.
- Section vertical padding is inconsistent across sections: observed `110px/30px`, `30px/0`, `30px/30px`, `80px/10px`, `10px/10px`. Recommend normalising to a small scale while preserving visual rhythm.
- Cards use white surfaces with subtle shadows and small radii.

### F.4 Breakpoints

Bootstrap 5 aligned, confirmed from the theme stylesheet:

| Breakpoint                          | Query count | Role                                                         |
| ----------------------------------- | ----------- | ------------------------------------------------------------ |
| 1399px                              | 12          | xxl                                                          |
| 1199px                              | 13          | xl                                                           |
| **991px**                           | **15**      | **lg — primary desktop/mobile switch, mobile nav activates** |
| 767px                               | 5           | md                                                           |
| 575px                               | 6           | sm                                                           |
| 440 / 430 / 396 / 390 / 385 / 359px | 1 each      | Ad-hoc patch breakpoints                                     |

Proposed Tailwind config uses Bootstrap-matching values (`sm:576`, `md:768`, `lg:992`, `xl:1200`, `2xl:1400`) so responsive behaviour matches without translation. The ad-hoc breakpoints will be replaced by fluid type and spacing rather than reproduced.

### F.5 Responsive behaviour observed

At 390px:

- Topbar wraps to two lines
- Header collapses to logo + hamburger; "Lets Connect" hidden
- Hero text centres, H1 scales down sharply, hero photo becomes a background
- Service tiles stack full-width
- Carousels drop to 1 per view
- Footer columns stack
- WhatsApp button overlaps body text (minor defect to avoid reproducing)

Still to verify during implementation: 768px and 1024px intermediate states, and the exact container widths per breakpoint.

---

## G. Animation Analysis

### G.1 Currently present

There is **no GSAP on the site today**. Animation is: `animate.css` classes, Swiper transitions, Waypoints-triggered counters and progress bars, and CSS smooth scroll.

| Animation             | Current                                                | GSAP rebuild                                              |
| --------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| Section reveals       | `animated fadeInLeft` (15 elements), `fadeInRight` (5) | **Built with IntersectionObserver + CSS, not GSAP** (m12) |
| Hero slide transition | Swiper fade, 300ms, 6s interval                        | GSAP crossfade timeline                                   |
| Services carousel     | Swiper slide, 1500ms, 4s interval                      | GSAP-driven translate                                     |
| Testimonial carousel  | Swiper slide, 600ms, 3s interval                       | Same component                                            |
| Skill bars            | progressbar.js + Waypoints, to 92% / 88%               | **CSS width transition on viewport entry** (m12)          |
| Scroll-to-top         | Class toggle                                           | Fade/scale in past threshold                              |
| FAQ accordion         | Bootstrap collapse                                     | GSAP height auto tween                                    |
| Hover states          | CSS transitions on buttons, cards, links               | Keep as CSS, do not move to JS                            |

### G.2 Principles for the rebuild

- GSAP for scroll-triggered reveals, the carousels, the accordion and the skill bars. CSS for all hover and focus states.
- **Never leave content permanently hidden if JS fails.** Reveal animations start from a visible base state and animate from there, or are gated behind a `js-enabled` class set at runtime. The current site fails this test.
- Full `prefers-reduced-motion` support: disable transforms and autoplay, show final states immediately.
- Pause carousel autoplay on hover, on focus, and when off-screen.
- Animate only `transform` and `opacity`.
- Do not add animations the original does not have.

---

## H. Technical Architecture

### H.1 Stack

- **Astro 5** — static output, one server endpoint for forms
- **Tailwind CSS 4** via `@tailwindcss/vite`
- **GSAP 3** with ScrollTrigger, loaded only where used
- **TypeScript** in strict mode
- `@astrojs/sitemap`, `astro:assets` for images
- `@fontsource-variable/dm-sans` self-hosted
- No jQuery, no Bootstrap, no Swiper, no Font Awesome, no Chart.js

### H.2 Proposed structure

```
src/
  assets/images/        # processed by astro:assets
    hero/ about/ services/ team/ faq/ blog/ banners/
  components/
    layout/             TopBar, Header, MobileNav, Footer,
                        FooterDisclaimer, CopyrightBar,
                        WhatsAppButton, ScrollToTop
    ui/                 Button, Card, Container, Section,
                        SectionHeading, Eyebrow, Icon
    home/               HeroCarousel, ServiceHighlightRow, AboutSplit,
                        ServicesCarousel, EmiCalculator, LeaderProfile,
                        AppointmentCta, FaqAccordion, TestimonialCarousel
    shared/             PageBanner, ServiceCard, SkillBars,
                        TestimonialGrid, ContactForm, ContactInfoList,
                        GoogleMap, PostCard, BlogSidebar
    modals/             ContactModal, CvUploadModal, Dialog
  content/
    config.ts           # Zod schemas, Sanity-shaped
    services/           # 4 entries
    testimonials/       # 7 entries
    faqs/               # 6 entries
    posts/              # 2 entries
    team/               # 1 entry
  data/
    site.ts             # nav, contact details, social
  layouts/
    BaseLayout.astro, PageLayout.astro, PostLayout.astro
  lib/
    emi.ts              # pure calculation, unit tested
    animations.ts       # GSAP helpers, reduced-motion guard
    forms.ts            # validation shared client/server
    seo.ts              # meta + JSON-LD builders
  pages/
    index.astro
    about.astro
    services/index.astro
    services/[slug].astro
    testimonials.astro
    contact.astro
    blog/index.astro
    blog/[slug].astro
    404.astro
    api/contact.ts      # prerender = false
  styles/global.css
```

### H.3 Content architecture and the Sanity path

All content lives in Astro content collections with typed Zod schemas, deliberately shaped to match the Sanity document types you will create later. No content is hardcoded in component markup.

Proposed collections and their future Sanity equivalents:

| Collection     | Fields                                          | Future Sanity type       |
| -------------- | ----------------------------------------------- | ------------------------ |
| `services`     | title, slug, icon, summary, body, order, seo    | `service`                |
| `testimonials` | name, location, quote, order                    | `testimonial`            |
| `faqs`         | question, answer, order                         | `faq`                    |
| `posts`        | title, slug, date, author, excerpt, image, body | `post`                   |
| `team`         | name, role, bio, photo                          | `teamMember`             |
| `siteSettings` | contact, nav, social, disclaimers               | `siteSettings` singleton |

Because every page reads through a thin data layer rather than importing files directly, switching to Sanity later means changing the loader, not rewriting pages.

### H.4 Deployment

Static output plus one server route. `@astrojs/node` in standalone mode is
installed so the endpoint runs locally and on any Node host; swapping to
`@astrojs/vercel` or `@astrojs/netlify` is the single `adapter:` line in
`astro.config.mjs`. Note the build output moved to `dist/client` (static) and
`dist/server` (the endpoint) once an adapter is present.

---

## I. Migration Roadmap

Each milestone ends with a visual comparison against the WordPress original before moving on.

| #   | Milestone             | Deliverable                                                                                                                      |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 0   | **Project setup**     | Astro + Tailwind + TS + GSAP scaffold, git repo, Tailwind theme with the tokens from section F, DM Sans self-hosted, base layout |
| 1   | **Asset acquisition** | All 42 assets downloaded, organised, optimised. Nothing pointing at WordPress or the theme demo server.                          |
| 2   | **Global chrome**     | TopBar, Header, MobileNav, Footer, disclaimer, copyright bar, WhatsApp, scroll-to-top. Correct at all 5 viewports.               |
| 3   | **Design system**     | Button, Card, Container, Section, headings, Icon set as inline SVG                                                               |

### Design system — Milestone 03 COMPLETE

- [x] `Container` (Bootstrap max-widths), `Button` (primary / onDark / link),
      `Eyebrow` (plain + pill), `SectionHeading`, `Icon` (inline SVG set)
- [x] Eyebrow pill reproduced from the original's pseudo-elements: a 7px dot
      and a navy panel at **15% opacity** with a 15px radius
- [x] Corrected two type tokens against measurement: hero line box is 90px at
      80px (1.125, was 1.06) and section line box 70px at 60px (1.1667)

### Homepage part 1 — Milestone 04 COMPLETE

- [x] Hero carousel — 3 slides, GSAP crossfade, 6s autoplay, 300ms, dots
- [x] Service highlight row — 3 full-bleed tiles
- [x] About split — overlapping images + copy

**Measured against the original at 1440. All deltas zero unless noted:**

| Element                                             | Result                             |
| --------------------------------------------------- | ---------------------------------- |
| Hero section, pill, h1, paragraph, CTA, figure      | exact (0 on top/left/width/height) |
| Service tiles: top, height, padding, title line box | exact                              |
| Tile title baselines (all three)                    | exact at y=1113                    |
| About section, both images, eyebrow, h2, paragraph  | exact                              |
| About CTA                                           | 1px narrow                         |

Findings during the build:

- The hero figure is **bottom-aligned** to the section edge (797px ending on
  the 907px boundary), not centred with the copy.
- The service tiles carry **Elementor background overlays** that make the text
  legible: `#1C1E22` at 0.7 on tiles 1 and 3, rising to 0.8 on hover, and
  `#0E6C90` at 0.8 on tile 2. The middle tile reads blue because of that
  overlay, not because the photograph is blue. Without these the white text
  sits unreadably on light photography.
- Elementor sections use **different gutters** from the theme's Bootstrap
  container: two 660px columns flush to the 1320px edge, each inset 10px.
  Header and footer keep `.container-bs`; the About section does not.
- The About copy block deliberately **overflows its column 31px upward**.
- Tile content **top-aligns** to its 70px padding rather than centring.

**Bug found and fixed in our own code:** when a tab is hidden,
`requestAnimationFrame` throttles and GSAP's ticker pauses. A crossfade
interrupted that way never completed, so the `animating` guard latched on and
left two slides half-faded permanently. In-flight timelines are now snapped to
completion on `visibilitychange` and on leaving the viewport. Verified over 10
samples: exactly one slide at opacity 1 at all times.

**Responsive:** no horizontal overflow at 390 / 768 / 992 / 1920.

**Note for milestone 12/14:** GSAP + ScrollTrigger is a 112 KB raw chunk
(~40 KB gzipped). Worth revisiting whether ScrollTrigger is needed everywhere
or can be loaded per-section.

| 4 | **Homepage part 1** | Hero carousel, service highlight row, about split |
| 5 | **Homepage part 2** | Services carousel, leader, appointment CTA |
| 6 | **EMI calculator** | Full rebuild with unit tests on the maths |
| 7 | **Homepage part 3** | FAQ accordion, testimonial carousel. Homepage complete. |
| 8 | **Inner pages** | About, Services, Testimonials |
| 9 | **Service detail pages** | 4 new pages, fixing defect #1 |
| 10 | **Contact + forms** | Contact page, both modals, validation, reCAPTCHA v3 hooks, `/api/contact` stub |
| 11 | **Blog** | Index, post template, clean sidebar, 404 page, **privacy policy page** |
| 12 | **Animation pass** | GSAP reveals, ScrollTrigger, reduced-motion, performance tuning |
| 13 | **SEO + accessibility** | Meta, canonicals, OG, JSON-LD, sitemap, robots, heading hierarchy, labels, ARIA, skip link, keyboard audit |
| 14 | **Performance + QA** | Lighthouse, cross-browser, 5 viewports, final side-by-side comparison |
| 15 | **Handover** | SMTP + reCAPTCHA keys wired, Sanity migration notes, README |

---

## J. Migration Checklist

Updated continuously. `[ ]` pending, `[x]` done, `[~]` in progress, `[!]` blocked.

### Setup — Milestone 00 COMPLETE (commit `d1921ba` + follow-up)

- [x] Astro project initialised — Astro **7.2.9** (newer than the 5 assumed in section H.1)
- [x] Git repository initialised
- [x] Tailwind 4.3.3 configured with Anchor tokens, all 8 colours verified in-browser
- [x] Bootstrap-aligned breakpoints configured (576/768/992/1200/1400) + `.container-bs`
- [x] TypeScript — using `astro/tsconfigs/strictest`, plus `~/*` path alias
- [x] GSAP 3.15 installed (ScrollTrigger ships with the package)
- [x] DM Sans self-hosted as woff2, 4 files emitted, load confirmed (no fallback)
- [x] Prettier configured with Astro + Tailwind plugins
- [~] ESLint — **deferred.** `astro check` (0 errors/warnings/hints) plus Prettier
  covers this project's needs; revisit only if lint gaps appear.
- [x] Content collection schemas defined, shaped to the planned Sanity types
- [x] BaseLayout with SEO, JSON-LD, skip link, environment-gated robots
- [x] `site.ts` single source for contact data (fixes defect #4 structurally)
- [x] Sticky footer (fixes defect #25)
- [x] Scroll-reveal safe base state (fixes the G.2 content-loss risk)

**Verification:** build clean, `astro check` 0/0/0, homepage 168 KB total against
WordPress's 3.30 MB. Body renders 16px/26px `#777` and H1 80px/700 `#1C1E22`,
matching the source exactly.

**Bonus, pulled forward from milestone 08:** the 6 real FAQs and 7 real
testimonials are already migrated into content collections and rendering.

### Assets — Milestone 01 COMPLETE

- [x] Client supplied the full WordPress media export: 164 files, 9.8 MB
- [x] 41 required assets sorted into `src/assets/images/<category>/`
- [x] **The 11 "hotlinked" files were in the export all along**, byte-identical
      (sha256 verified against the theme demo server). Defect #5 was gratuitous:
      the files were uploaded to Anchor's library, but the Elementor markup
      pointed at `finaxio.nextwpcook.com`. Nothing had to be fetched from a
      third party.
- [x] Logo trimmed 1932×821 → 1505×362, removing dead padding
- [x] Favicon (custom SVG) + `og-default.png` 1200×630 generated
- [x] Images optimised: **4.82 MB → 1.13 MB, saving 3.69 MB.** Ten 1520×266
      banner photographs were stored as PNG with no transparency and are now
      JPEG q88 4:4:4 (e.g. 548 KB → 101 KB, visually identical). Files with
      genuine alpha — hero cutouts, icons, the portrait — stay PNG.
- [x] Astro `<Image>` handles WebP/AVIF conversion at build from these sources
- [ ] Service icons extracted as SVG — **deferred**, current PNGs are 3–4 KB
      each so the gain is marginal; revisit if a retina issue appears
- [x] UI icons inlined as SVG — Font Awesome and the flaticon font both dropped
- [x] Real alt text written for every image — 44 meaningful, 47 explicitly decorative, 0 unlabelled
- [x] Zero references to WordPress or `finaxio.nextwpcook.com`

**Total shipped assets: 2.6 MB source** (banners 1.3 MB, hero 660 KB,
services 392 KB, rest small), before Astro's build-time WebP/AVIF conversion.

#### Banner images: a better outcome than expected

Defect #2 was diagnosed as mixed content. The real cause is worse and simpler:
**the referenced banner files do not exist on the server.** `2026/02/1.webp`,
`3.webp`, `4.webp`, `2.jpg` and `2023/08/Add-a-heading.webp` all return 404,
and the media library has no `2026/02/` uploads at all.

The export, however, contains **14 purpose-made 1520×266 banner images** whose
filenames map cleanly to pages: `about`, `service`, `testi`, `cont`/`contact`,
plus `motr` (Mortgage Solutions), `cf` (Commercial Finances) and `rent` (Lease
Rental Discounting). They carry a blue tint overlay, clearly designed to sit
behind white title text — exactly what the Q1 decision calls for.

So the banners were designed and uploaded, then lost their wiring. Two gaps
remain: **no banner for Construction & Developer Finance, and none for Blog**
(see Q13).

### Global components — Milestone 02 COMPLETE

- [x] TopBar — 46px, #084876, 14px/400 items
- [x] Header + nav — 90px row, not sticky, matching the original exactly
- [x] Mobile nav (below 992px, push-down behaviour, `aria-expanded`, Esc to close)
- [x] Footer — 3 bands, columns at 90 / 530 / 970
- [x] Footer disclaimer strip — 71px
- [x] Copyright bar — 66px, contrast fixed
- [x] WhatsApp button (pulled in on narrow screens so it no longer overlaps copy)
- [x] Scroll-to-top (hidden until 400px scrolled, honours reduced motion)
- [x] Skip-to-content link
- [x] Inline SVG icon set replacing Font Awesome

**Measured against the original at 1440px. Deltas after tuning:**

| Metric                | WordPress         | Astro             | Delta      |
| --------------------- | ----------------- | ----------------- | ---------- |
| Container width       | 1320              | 1320              | 0          |
| Header row height     | 90                | 90                | 0          |
| Logo slot / wordmark  | 72–222 / 89–205   | 72–222 / 89–206   | +1         |
| Nav "Home"            | 370–414           | 370–414           | 0          |
| Nav "About Us"        | 458–528           | 458–528           | 0          |
| Nav "Services"        | 572–636           | 572–636           | 0          |
| CTA button            | 1197–1368, 171×60 | 1197–1368, 171×60 | 0          |
| Footer columns        | 90 / 530 / 970    | 90 / 530 / 970    | 0          |
| Footer band 1 / 2 / 3 | 407 / 71 / 66     | 406 / 71 / 66     | −1 / 0 / 0 |
| Quick-links rhythm    | 38px, items 21px  | 38px, items 21px  | 0          |
| Footer buttons        | 39px tall         | 39px tall         | 0          |

Only remaining difference: "Testimonials" renders 94px against the original's
98px, a variable-font versus static-font metric difference. This shifts Blog
and Contact left by 5px. Not worth forcing.

**Responsive:** no horizontal overflow at 390 / 768 / 992 / 1200 / 1920. The
desktop nav and mobile toggle swap correctly at exactly 992px.

Two findings during the build:

- Reproducing the logo needed care. The source PNG carried heavy padding, so
  the wordmark rendered at ~117px inside a 150px slot. Trimming the asset and
  sizing it naively would have made the logo ~28% larger than the original.
- The original renders the footer pitch as **one unstyled paragraph** with a
  `<br><br>`, not a bold heading plus body. The screenshot reads as bold; the
  computed styles say otherwise.

### Homepage

- [x] Hero carousel (3 slides, fade, 6s)
- [x] Service highlight row
- [x] About split
- [x] Services carousel
- [x] EMI calculator
- [x] Leader profile
- [x] Appointment CTA
- [x] FAQ accordion (6 items)
- [x] Testimonial carousel
- [ ] Visual comparison signed off

### Inner pages

- [x] Page banner resolved (see Q1)
- [x] About
- [x] Services
- [x] Service detail x4
- [x] Testimonials (7)
- [x] Contact
- [x] Blog index
- [x] Post template
- [x] Blog sidebar (deduplicated)
- [x] 404
- [x] Privacy policy (holding page — see Q15)

### Forms

- [x] Contact form with real labels
- [x] Correct input types
- [x] Client-side validation + `aria-live` errors
- [x] Honeypot
- [x] Contact modal
- [x] CV upload modal with type + size limits
- [x] `/api/contact` endpoint
- [x] reCAPTCHA v3 integration point
- [x] SMTP integration point
- [x] End-to-end test — verified against a local SMTP sink; see m15

### Animation

- [x] Reveal system (IntersectionObserver + CSS, not GSAP — see milestone 12)
- [x] Scroll reveals
- [x] Skill bars
- [x] Accordion tween
- [x] Carousel motion
- [x] `prefers-reduced-motion` honoured throughout
- [x] Content never permanently hidden if JS fails
- [x] Autoplay pauses on hover/focus/off-screen

### Defect fixes

- [x] #1 Service detail pages exist (no 404s)
- [x] #2 Inner banners resolved
- [x] #3 One visible H1 per page
- [x] #4 Single canonical phone number, valid `tel:`
- [x] #5 No hotlinked assets
- [x] #6 `Discover More` points to `/about/`
- [x] #7 Privacy Policy linked
- [x] #8 FAQ link resolved
- [x] #9 Sidebar deduplicated
- [x] #10 Months slider range corrected
- [x] #11 Calculator output rows resolved
- [x] #12 Consistent number formatting
- [x] #13 Real alt text
- [x] #14 Heading hierarchy correct
- [x] #15 Labels + input types
- [x] #16 `aria-expanded` present
- [x] #17 Skip link
- [x] #18 `questions.b` typo fixed
- [x] #19 Slug typo resolved
- [x] #20 Demo contacts removed
- [x] #21 Robots policy environment-driven
- [x] #22 Real meta descriptions on all pages
- [x] No dead/hidden markup carried over

### SEO

- [x] Unique titles
- [x] Hand-written meta descriptions (all 14 within 120–160)
- [x] Canonicals
- [x] Open Graph + Twitter cards
- [x] JSON-LD: Organization, WebSite, BreadcrumbList, BlogPosting, Blog, FAQPage, Service, ContactPage
- [x] `sitemap.xml` (no 404 URLs)
- [x] `robots.txt`
- [x] Internal links all resolve

### Accessibility

- [x] Keyboard navigable throughout (59 focusables on the busiest page, no positive `tabindex`)
- [x] Visible focus states
- [x] Contrast checked — `#777` was **4.48:1, which fails AA**, not marginal. Fixed in m13.
- [x] Carousels keyboard + screen-reader usable
- [x] Modals: focus trap, restore focus (Esc is native; unverifiable in this preview)
- [x] Forms fully labelled
- [x] Landmarks correct
- [ ] **Tested with a screen reader — not done. Needs a human with VoiceOver or NVDA.**

### Responsive

- [x] 375 / 390px mobile
- [x] 768px tablet
- [x] 1024px laptop
- [x] 1440px desktop
- [x] 1920px large desktop
- [x] No horizontal scroll at any width (61 page/viewport combinations, zero overflow)

### Performance

- [x] Homepage under 500 KB (192 KB first load, heaviest page 194 KB)
- [x] Lighthouse 90+ on all four categories
- [x] LCP image prioritised (`fetchpriority="high"`)
- [~] Zero unused JS shipped — 35 KB of GSAP is unused on the homepage; see m14
- [x] Fonts subset with `font-display: swap`

### Final

- [ ] Side-by-side comparison, every page, every breakpoint
- [ ] Cross-browser (Chrome, Safari, Firefox, iOS Safari)
- [x] Production build clean
- [x] README written
- [x] Sanity migration notes written (`SANITY.md`)

---

### Homepage part 2 — Milestone 05 COMPLETE

- [x] Services carousel — 3 cards, GSAP track, 4s autoplay, 1500ms, loop, arrows
- [x] Leader profile — Samaira Nichani card
- [x] Appointment CTA (shares the leader's section and background on the original)

**Measured against the original at 1440:**

| Element                                                         | Result     |
| --------------------------------------------------------------- | ---------- |
| Services section height, eyebrow, h2, card, icon, title offsets | **exact**  |
| Slide positions (72 / 504 / 936) and card size (432x324)        | **exact**  |
| Leader section height, h2, card (1140x488 at x=150), portrait   | **exact**  |
| Appointment copy and link offsets                               | **exact**  |
| Role / name / bio                                               | within 1px |

Findings:

- Both sections sit on `services.jpg` under a **#436B88 overlay at 0.9**.
- The carousel highlights the **centre** of the three visible cards, not the
  first: that card takes a `#F7F7F7` tint and is the only one whose navy
  "Services Details" bar is visible. Every card has one; the rest are at
  opacity 0.
- Card width is a third of the container, which is exactly 432px at 1440.

**Two bugs found in our own code:**

1. `bg-mist` was toggled from script only. Tailwind's scanner never sees
   classes that appear solely inside `<script>`, so the utility was never
   generated and the active card silently stayed white. Active state now
   lives in scoped CSS driven by a `data-active` attribute, which cannot fail
   this way.
2. The carousel's loop reset ran on tween completion. With `requestAnimationFrame`
   throttled (background tab), tweens never complete, so the index grew past
   the end of the track and _no_ card stayed highlighted. Normalisation now
   runs before each move, so the index is always bounded.

Also fixed: an inline `--card-w` custom property outranked the responsive
media queries, pinning cards at 432px on tablet.

**Safety net added:** if ScrollTrigger never fires (throttled rAF, or an
error), anything at or above the fold that is still hidden after 3s is
force-shown. Content below the fold keeps its animation.

**Responsive:** no horizontal overflow at 390 / 768 / 1440 / 1920. Cards go
three-up, two-up, then full width.

### EMI calculator — Milestone 06 COMPLETE

- [x] Rebuilt from scratch in TypeScript; the plugin, Chart.js and
      rangeslider.js are all gone
- [x] Pure calculation in `src/lib/emi.ts`, **12 unit tests** via Node's
      built-in runner (`npm test`) — no test framework added
- [x] All three outputs shown (Q3), months slider extended to 360 (Q3)
- [x] Consistent thousands separators, fixing defect #12
- [x] Two-way sync between each number field and its slider
- [x] Yr/Mo switch converts the value and re-ranges the controls
- [x] Inline validation with `role="alert"`; out-of-range input still shows a
      clamped result rather than blanking the panel
- [x] Labelled inputs, aria-labelled sliders, `aria-live` results, keyboard
      operable throughout

**Output at the defaults matches the original exactly: 1,189 / 21,370 / 71,370.**

**Geometry — every metric exact but two 1px roundings:**

| Metric                       | WordPress      | Astro               |
| ---------------------------- | -------------- | ------------------- |
| h2 / card left, card width   | 70 / 70 / 640  | identical           |
| Label left + width           | 86 / 203       | identical           |
| Amount input left + width    | 304 / 218      | identical           |
| Rate + tenure input widths   | 236 / 182      | 236 / 181           |
| Unit chip                    | 57x44          | identical (left +1) |
| Slider left / width / offset | 86 / 608 / 75  | identical           |
| Image                        | 570x500 at 800 | identical           |

This section uses the **Elementor gutter** (1300px of content from x=70), not
the Bootstrap container, and its columns are a fixed 640 + 570 with a 90px
gap rather than an even split.

**Two bugs found, one in the original and one in my own code:**

1. `applyUnit()` ran on first load and "converted" years to years, turning the
   default 5-year tenure into 1. Conversion now only happens when the unit
   actually changes.
2. The tests caught **my own arithmetic error**: I had recorded the exact EMI
   as 1,189.35 and concluded the original's totals were derived from a rounded
   instalment. The real figure is 1,189.4965 and the original's totals are
   correct. The audit note in section D.2 has been corrected.

### Homepage part 3 — Milestone 07 COMPLETE · **HOMEPAGE FINISHED**

- [x] FAQ accordion — 6 items, single-open, GSAP height tween
- [x] Testimonial carousel — 5 items, 3 per view, 3s autoplay, 600ms, arrows + dots

**Every measured metric is exact:**

| Metric                                         | WordPress        | Astro     |
| ---------------------------------------------- | ---------------- | --------- |
| FAQ section height                             | 872              | 872       |
| FAQ eyebrow / h2 offsets                       | 43 / 71          | identical |
| FAQ images (510x510 at x=70, 200x200 at x=440) | —                | identical |
| FAQ item 1 / 6 offsets, box 640x150 and x58    | 171 / 679        | identical |
| Badge 50px circle offset                       | 782              | identical |
| Testimonials section height                    | 400              | 400       |
| Eyebrow / h2 offsets                           | 43 / 86          | identical |
| Slide height, dots offset, dot size            | 104 / 329 / 13   | identical |
| Quote width, arrow box, arrow x                | 393 / 32x36 / 60 | identical |

Total page height is 6390 against the original's 6239. The 151px difference is
exactly the two extra calculator rows requested in Q3.

**Accessibility work beyond the original:**

- **Defect #14 fully closed on the homepage.** The page now has exactly **one
  h1 and zero skipped heading levels**. The original had six h1 elements (five
  visible) and jumped h2 → h4 → h6. Two changes did it: only the first hero
  slide's title is an `h1` (the rotating slides would otherwise emit three,
  the others are styled paragraphs), and the tile row was promoted from h3 to
  h2 since it has no section heading above it.
- The accordion follows the ARIA disclosure pattern: `aria-expanded`,
  `aria-controls`, `role="region"`, `aria-labelledby`, plus Arrow / Home / End
  key navigation. The original had no ARIA at all (defect #16).

**Findings:**

- The eyebrow-to-heading gap is **not consistent** in the original: 22px on
  About and services, 7px in the FAQ. `SectionHeading` now takes a `gap` prop
  rather than assuming one value.
- The testimonial track uses Swiper's `spaceBetween` model, where the slide
  pitch is `(track + gap) / 3`. A padding-based gutter gives `track / 3`, so
  the track needed to be 1240 rather than 1220 to land on the original's
  413.33px pitch.
- Nearly hit the Tailwind JIT trap again: `mt-[${gap}px]` built from a prop is
  never seen by the scanner. Uses an inline style instead.
- Hardened the accordion the same way as the carousels: in-flight tweens are
  tracked and snapped to completion when the tab is hidden, so a throttled
  animation cannot leave a panel visible while `aria-expanded` says closed.

**Homepage output:** 76 KB of HTML, 1.5 MB total build including every image
variant. The original homepage alone transferred 3.30 MB.

### Inner pages — Milestone 08 COMPLETE

- [x] `PageBanner` — the Q1 decision, shipped
- [x] About
- [x] Services
- [x] Testimonials
- [x] `services` content collection populated with the four real services

**Every measured metric is exact; all three page heights land within 1px.**

| Page         | Metrics                                                         | Result                           |
| ------------ | --------------------------------------------------------------- | -------------------------------- |
| About        | banner, both sections, all four image positions, eyebrow, h2    | **all exact**, page 2540 vs 2541 |
| Services     | both sections, card grid, card height, icon offset, skill image | **all exact**, page 2255 vs 2256 |
| Testimonials | all three row positions, grid origin and width                  | **all exact**, page 1657 vs 1658 |

#### Defects #2 and #3 closed

The banner was an empty 226px grey strip on five pages, with no visible h1
anywhere. It now carries the page title and a breadcrumb over the
purpose-made 1520x266 images recovered from the client's own library.

Three corrections were needed beyond simply un-hiding the original markup:

- The original puts `opacity: 0.8` on the banner element itself, which would
  fade the restored text along with the photograph. The dim is a separate
  overlay here, so the copy stays at full strength.
- The breadcrumb was `#777` on a dark ground. It is white at 75% now.
- The referenced images 404; these are the recovered ones.

#### Findings

- The About page's image column is **10px inside** the section's padding box
  on both edges, and its second image is absolutely positioned, so the column
  needs an explicit height to enclose it. Its second section carries **90px
  below the copy column**.
- Service cards follow a precise rhythm: 60px padding, 80px icon, 61px gap,
  36px-per-line title with 20px beneath, then a 26px "Read More" line. That
  produces exactly the original's 343px for a one-line title and 379px for two.
- The **skill bars are 92% and 88%**, not the 63% / 60% recorded during the
  audit. Those earlier figures were read mid-animation. Section F of this
  document has been corrected.
- The "Skillset" eyebrow is `#EC1113` — the only red on the entire site.
- Hit the **stale dev content store** again (same as milestone 00): newly added
  collection entries render in `astro build` but not in an already-running dev
  server. Clearing `.astro/collections` and restarting fixes it.

**Known interim state:** the service cards link to `/services/<slug>/`, which
milestone 09 creates. Those four links 404 until then.

### Service detail pages — Milestone 09 COMPLETE

- [x] `/services/[slug]` template, four pages generated from the collection
- [x] Defect #1 fully closed: **every internal link in the build now resolves**
- [x] Defect #24 handled: `features` and `checklist` are optional, so Lease
      Rental Discounting renders correctly with neither
- [x] Q12 applied: a closing CTA, which the original lacks
- [x] `Service` JSON-LD per page, plus breadcrumbs

**Every measured metric is exact:**

| Metric                 | WordPress                | Astro     |
| ---------------------- | ------------------------ | --------- |
| Banner height          | 226                      | 226       |
| Hero image             | 1290x670 at x=75, y=482  | identical |
| "Description:" heading | y=1202, x=82             | identical |
| Body copy              | y=1246                   | identical |
| Feature cards          | 3, y=1438, x=82, 94 tall | identical |
| Checklist              | 7 items, first at y=1569 | identical |

Page height is 2727 against the original's 2504. The 223px difference is the
Q12 CTA.

**Link integrity across the whole build:**

|                        |                                                           |
| ---------------------- | --------------------------------------------------------- |
| Routes generated       | 8                                                         |
| Internal links checked | 12                                                        |
| Resolving              | 9                                                         |
| Still 404              | 3 — `/contact/` (m10), `/blog/` (m11), `/privacy-policy/` |

**New gap found:** `/privacy-policy/` is linked from the footer on every page
(our fix for defect #7, where the original pointed at `#`) but no such page
exists in the milestone plan. The WordPress site has content at
`/privacy-policy-2/`. **Added to milestone 11.**

Also fixed a copy error carried from the original: the Mortgage Solutions
description reads "both S alaried and Self-Employed", with a stray space.

### Contact, forms and modals — Milestone 10 COMPLETE

- [x] `/contact/` page: banner, full-bleed map, details column, form panel
- [x] `ContactForm` shared by the page and the modal
- [x] `ContactModal` and `CvUploadModal` on native `<dialog>` + `showModal()`
- [x] `/api/contact` endpoint, with reCAPTCHA v3 and SMTP slots wired but unset
- [x] `@astrojs/node` adapter added — the endpoint cannot build without one
- [x] All four Popup Maker triggers reproduced (header, appointment row x2, footer)

**Contact page geometry at 1440 — every value matches:**

| Metric                                   | WordPress                                   | Astro     |
| ---------------------------------------- | ------------------------------------------- | --------- |
| Map iframe                               | 1300x535 at x=70, y=482                     | identical |
| "Contact Info" eyebrow                   | x=60, y=1140                                | identical |
| "Find us here."                          | 60px/44px, x=60, y=1183, 663 wide           | identical |
| Info rows                                | x=68, 605 wide, y=1297 / 1354 / 1411        | identical |
| Form panel                               | #F7F7F7, 40px pad, 607x622 at x=773, y=1137 | identical |
| Form                                     | 527x483 at x=813, y=1236                    | identical |
| Name / Email / Phone / Question / Submit | 60 / 60 / 60 / 220 / 60 tall                | identical |

**Responsive, measured against the original at each breakpoint:**

| Width | Panel (WP) | Panel (Astro) | Heading (WP / Astro) |
| ----- | ---------- | ------------- | -------------------- |
| 375   | x=10, 355  | x=10, 355     | 32/28 · 32/28        |
| 768   | x=25, 718  | x=25, 718     | 46/44 · 46/44        |
| 992   | x=25, 942  | x=25, 942     | 46/44 · 46/44        |
| 1440  | x=773, 607 | x=773, 607    | 60/44 · 60/44        |

The original splits into two columns at 1200, not 992. Building it at 992
overflowed the viewport by 278px; caught by measurement, now fixed. The
original itself overflows horizontally at 375 (`scrollWidth` 380 against a
375 client width); ours does not, at any width.

**Fidelity corrections found by measuring rather than eyeballing:**

- The map section pads 120px, not the 110px used elsewhere on the site.
- This page's container carries no gutter at desktop, putting the left column
  at x=60 rather than the usual x=70.
- The appointment row's two triggers are plain 14px/700 text with no icon.
  Ours carried a chevron, making each 21px too wide; removed. Their colour in
  the original is #777 over a dark photograph, which is defect #27 — kept
  white here.

**Three genuine bugs found and fixed during verification:**

1. Tailwind's preflight zeroes margins on every element, which removes the UA
   `margin: auto` that centres a modal `<dialog>`. Every modal was rendering
   pinned to the top-left corner.
2. The "focus the first field" call selected `input`, which matched the hidden
   `kind` input first. `focus()` on a hidden input is a silent no-op, so focus
   stayed on the close button.
3. The scroll lock was released from the dialog's `close` event. It now keys
   off the `open` attribute via a `MutationObserver`, so Esc, the close
   button, the backdrop and a programmatic `close()` all release it the same
   way, and a double-open cannot strand the page locked.

**Verified in-browser:** open via all four triggers; close via backdrop and
close button; focus lands on the first field; scroll locks and releases;
empty-submit validation on both forms; a bad email address; a valid submit
round-tripping through `/api/contact`.

Escape-to-close could not be exercised here: this browser pane never
dispatches a dialog's `close` or `cancel` events, and a bare native
`<dialog>` built in the console behaves identically, so it is a harness
limitation rather than a defect in our code. It needs a real browser to
confirm.

**Nothing pretends to have been sent.** With no SMTP configured the endpoint
returns `delivered: false`, logs the full submission to the server console,
and the form tells the visitor plainly that the message was not sent and to
call or email instead. Verified end to end.

### Blog, 404 and privacy — Milestone 11 COMPLETE

- [x] `/blog/` index, `/blog/[slug]/` template, both posts ported
- [x] Deduplicated sidebar — defect #9 closed
- [x] `/404` with the banner restored, defect #28 logged for the copy
- [x] `/privacy-policy/` — defect #7 closed
- [x] **Every internal link in the build resolves: 360 links, 14 routes, zero 404s**

**Blog index at 1440 — every value matches:**

| Metric                 | WordPress                 | Astro     |
| ---------------------- | ------------------------- | --------- |
| Left column            | x=72, 856 wide            | identical |
| Sidebar                | x=952, 416 wide           | identical |
| Post 1                 | y=482, 797 tall           | identical |
| Featured image         | 750x500 at x=72           | identical |
| Card body              | y=982, 297 tall, 40px pad | identical |
| Meta / title / excerpt | y=1022 / 1063 / 1109      | identical |
| Post 2                 | y=1319, 193 tall          | identical |
| First widget           | y=482, 140 tall           | identical |

**Post template at 1440 — every value matches:** panel x=72 / 856 wide / 40px
padding / `0 0 70px rgba(0,0,0,.08)`; image 750x500 at (112, 522); meta row at
y=1052, 57 tall with a 1px #EDEDED rule; body at y=1134. The panel is 899 tall
against the original's 1514 — the difference is the comment form (Q14).

**404 at 1440:** "404" 300px/285px at y=482, subhead at y=767, button 175x60
centred on 720. All identical to the original.

**Responsive, measured against the original at each breakpoint:**

| Width | Left col (WP) | Left col (Astro) | Sidebar (WP) | Sidebar (Astro) |
| ----- | ------------- | ---------------- | ------------ | --------------- |
| 375   | x=12, 351     | x=12, 351        | stacked, 351 | stacked, 351    |
| 768   | x=36, 696     | x=36, 696        | stacked, 696 | stacked, 696    |
| 992   | x=28, 616     | x=28, 616        | x=668, 296   | x=668, 296      |
| 1440  | x=72, 856     | x=72, 856        | x=952, 416   | x=952, 416      |

The original is a Bootstrap col-8 / col-4 row, where the row cancels the
container's 12px gutter and each column re-applies it. Percentage columns got
close but were 2-4px out at 992; reproducing the actual row/column mechanic
(`-mx-3` on the grid, `px-3` on each column) matches at every width.

**Sidebar deduplication (defect #9).** The original renders seven widgets:

| #   | Widget                                   | Kept?                        |
| --- | ---------------------------------------- | ---------------------------- |
| 1   | Search                                   | Kept                         |
| 2   | Recent Posts (plain links)               | Dropped — duplicate of 6     |
| 3   | Recent Comments ("No comments to show.") | Dropped — see Q14            |
| 4   | Archives                                 | Dropped — duplicate of 7     |
| 5   | Categories                               | Kept                         |
| 6   | Recent Posts (thumbnail + date)          | Kept — the richer of the two |
| 7   | Archives                                 | Kept                         |

Search, category and archive links were WordPress routes a static build does
not have. Rather than drop the widgets or ship dead links, all three now pass
a query parameter to `/blog/`, which filters client-side. Verified: search
narrows to one post, category returns both, an unmatched term shows the empty
state, and the term is reflected back into the search box.

**A real bug caught at 768 and below.** The 449-character unbroken string in
the placeholder post expanded the grid track to 3861px, overflowing the page.
Grid and flex tracks default to `min-width: auto`, and `overflow-wrap:
break-word` does not reduce a track's min-content width — only `anywhere`
does. Fixed with `min-w-0` on the columns plus `anywhere` on the title and
excerpt. Worth remembering: real posts will not have a 449-character word,
but a long URL would do the same thing.

**Image alt audit across the whole build:** 44 images carry meaningful alt
text and 47 are explicitly decorative (empty alt plus `aria-hidden`). Zero
images are unlabelled. Defect #13 closed. The post's lead image had an empty
alt inherited from the media library and now describes the photograph.

**Both posts are placeholders and were ported verbatim.** One is literal
keyboard mash, the other is WordPress's default "Hello world!". Nothing was
invented to replace them — see Q8. They exercise the template usefully: one
with a featured image and one without, which is exactly the pair the original
renders.

### Animation pass — Milestone 12 COMPLETE

- [x] Reveals and skill bars moved off GSAP onto IntersectionObserver + CSS
- [x] ScrollTrigger removed entirely — nothing needed scroll-linked tweening
- [x] `prefers-reduced-motion` audited across every effect, plus a global guard
- [x] Reveal logic covered by 13 unit tests

**The 112 KB chunk was on every page.** `PageLayout` imported the GSAP module
to run scroll reveals, so all fourteen routes downloaded GSAP + ScrollTrigger
to fade a heading in. The reveal is a 30px rise and an opacity change, which a
CSS transition does natively; only the _timing_ needed JavaScript, and that is
an IntersectionObserver.

|                 | Before                  | After                        |
| --------------- | ----------------------- | ---------------------------- |
| Homepage        | 117 KB raw / 46 KB gzip | 79 KB raw / **32 KB gzip**   |
| `/services/`    | 117 KB raw / 46 KB gzip | 6.0 KB raw / **3.2 KB gzip** |
| Other 12 routes | 117 KB raw / 46 KB gzip | 5.8 KB raw / **3.0 KB gzip** |

Removing ScrollTrigger accounted for 16 KB gzip of the homepage saving on its
own, once reveals and skill bars no longer needed it.

GSAP stays where it earns its place — the hero crossfade, both carousels and
the accordion — which is the homepage only.

**A correction to my own reasoning.** I first justified the switch by saying
IntersectionObserver fires regardless of the requestAnimationFrame throttling
that made ScrollTrigger unreliable. That is wrong: IO callbacks are delivered
during the browser's rendering steps, so a non-rendering tab defers them too.
The real advantages are cost and self-healing — IO needs no polling ticker,
and it re-evaluates when rendering resumes rather than latching a guard the
way the hero timeline did. Because the premise was wrong, the safety net I
had removed went back in, as a scroll/resize/load sweep that does the same
viewport test by hand. Both paths converge on the same idempotent function.

**Reduced motion.** Every effect already checked the media query individually;
the JS paths do more than shorten a duration, since they also stop carousel
autoplay. A global `@media (prefers-reduced-motion: reduce)` block now
collapses all animation and transition durations as well, so an effect added
later cannot silently escape the policy. Nothing on the site waits on
`transitionend`, so that is safe.

**Verification, and what could not be verified here.** The browser preview
used throughout this rebuild does not run rendering frames: it never delivers
IntersectionObserver callbacks, never advances a CSS transition, and cannot
scroll (`scrollY` stays 0 however it is driven). Confirmed by control
experiment — a bare observer created in the console on a plainly intersecting
element also never fired.

What was verified in the browser: the initial sweep reveals above-fold content
and applies `data-reveal-delay` correctly; the CSS is right, proven by
disabling the transition and watching opacity resolve to 1; scroll listeners
bind and fire; below-fold content correctly stays hidden; the skill bars fill
to 92% and 88% when swept into the trigger zone; the accordion still opens one
panel at a time; no console or network errors on any page.

What could not be verified there, and is covered by 13 unit tests in
`src/lib/reveal.test.ts` instead: the observer path, the sweep fallback, the
no-IntersectionObserver path, the reduced-motion branch, delay handling,
listener unbinding, and idempotency. The visual transition itself still wants
a real browser.

### SEO and accessibility — Milestone 13 COMPLETE

- [x] `robots.txt` added, environment-gated, both branches verified
- [x] FAQPage structured data on the homepage
- [x] All 14 meta descriptions brought inside 120–160
- [x] Four real contrast failures fixed
- [x] Skip link now actually moves focus

**Audit method.** Rather than eyeballing pages, the build output is parsed and
asserted: one `<h1>` per route, no skipped heading levels, landmarks present,
exactly one `<main>`, skip link present and focusable, `lang`, canonical,
description length, every link and button with an accessible name, every
`<iframe>` titled, every `<img>` with an `alt`, and every JSON-LD block
parsing. **All 14 routes pass with zero findings.**

**Contrast: four genuine failures, all inherited from the original.**

| Colour             | Where                          | Before                                        | After                                   |
| ------------------ | ------------------------------ | --------------------------------------------- | --------------------------------------- |
| `--color-body`     | all body copy                  | 4.48:1 white / 4.18:1 on `#F7F7F7`            | **4.88 / 4.56** (`#777777` → `#717171`) |
| `--color-danger`   | form validation messages       | 4.51 / **4.21 on the grey form panel**        | **4.84 / 4.51** (`#EC1113` → `#E4090B`) |
| tile body + link   | homepage highlight tiles       | 3.97:1 at the brightest pixel behind the text | **4.62** (`#F0EDED`/`#F3F3F3` → white)  |
| hardcoded literals | 11 places bypassing the tokens | unchanged by the token fix                    | routed through `var(--color-*)`         |

The audit had recorded `#777` on white as "passes AA but is marginal". That
was wrong: 4.48:1 is _below_ the 4.5:1 floor, so it failed. Corrected above.

Every change is a few values per channel and is visually indistinguishable
from the original, which is the bar the brief sets for accessibility fixes.

**Text over photographs was measured properly rather than guessed.** A naive
sweep flags white text on the tiles and the leader band as 1:1, because it
resolves the background to the body's white — those sections layer an
absolutely positioned `<img>` under a colour overlay. Sampling the actual
pixels behind each text block gives:

| Surface                     | Overlay          | Worst pixel behind text                | Verdict |
| --------------------------- | ---------------- | -------------------------------------- | ------- |
| Tiles 1 and 3               | `#1C1E22` @ 0.70 | 5.29:1                                 | passes  |
| Tile 2                      | `#0E6C90` @ 0.80 | 3.97 → **4.62** after the white change | passes  |
| Leader band                 | `#436B88` @ 0.90 | 5.00:1                                 | passes  |
| Footer, white @ 90% on navy | —                | 8.06:1                                 | passes  |

**`robots.txt`** is gated on `IS_PRODUCTION_HOST`, the same flag as the robots
meta tag. Verified by building both branches: staging emits `Disallow: /` with
no sitemap line, production emits `Allow: /`, `Disallow: /api/` and the
sitemap URL. The placeholder privacy page stays out of the sitemap.

**Skip link.** It existed and pointed at `#main`, but `<main>` had no
`tabindex`, so browsers only moved the sequential-navigation starting point —
inconsistent, and silently nothing in some assistive tech. `<main>` now
carries `tabindex="-1"` with its focus ring suppressed, and focus movement is
verified.

**Not done: screen-reader testing.** The structural groundwork is right —
landmarks, headings, labels, `aria-roledescription="carousel"`, slide groups,
a tablist for the testimonial pagination, live regions on the forms — but none
of that is a substitute for listening to it. This needs a human with VoiceOver
or NVDA and is the one checklist item left open.

### Performance and QA — Milestone 14 COMPLETE

- [x] Lighthouse run for real, against a production build on a compressing server
- [x] Five viewports swept across every route
- [x] Four genuine bugs found and fixed
- [x] Checklist reconciled — rows for milestones 04–07 had never been ticked

**Lighthouse.** No Chrome on the machine, so Chrome for Testing was installed
locally (gitignored, `chrome/`) and Lighthouse 13 run headless.

| Route                           | Perf | A11y | Best practices | SEO  | LCP   | CLS |
| ------------------------------- | ---- | ---- | -------------- | ---- | ----- | --- |
| `/`                             | 93   | 100  | 100            | 100  | 3.0 s | 0   |
| `/about/`                       | 99   | 100  | 100            | 100  | 1.8 s | 0   |
| `/services/`                    | 99   | 100  | 100            | 100  | 1.7 s | 0   |
| `/services/mortgage-solutions/` | 99   | 100  | 100            | 100  | 2.0 s | 0   |
| `/testimonials/`                | 99   | 100  | 100            | 100  | 1.7 s | 0   |
| `/contact/`                     | 100  | 100  | 100            | 100  | 1.5 s | 0   |
| `/blog/`                        | 99   | 100  | 100            | 100  | 1.7 s | 0   |
| `/blog/dummy-blog/`             | 99   | 100  | 100            | 100  | 1.7 s | 0   |
| `/privacy-policy/`              | 99   | 100  | 100            | 69\* | 1.7 s | 0   |

\*The only failing SEO audit is "page is blocked from indexing", which is
deliberate: the privacy page is a placeholder and is `noindex` until the
client supplies approved text. Every other route scores 100.

**Measure against what will actually ship.** The first run scored Performance
85, with "render-blocking requests, est. saving 1,200 ms" and "document
request latency, 59 KiB". Both were artefacts of `astro preview`, which serves
everything uncompressed — the stylesheet is 44 KB raw but 9 KB gzipped, and
every target host compresses by default. `scripts/serve-compressed.mjs` serves
`dist/client` with gzip and production-like cache headers; against that the
same build scores **93**, and FCP drops 2.7 s → 1.9 s. The SEO score likewise
needed `IS_PRODUCTION_HOST=true`, since a staging build is correctly `noindex`.

**Four real bugs, all found by measuring rather than looking:**

1. **Fixed grid tracks overflowed at 1024.** `lg:grid-cols-[660px_640px]` and
   four siblings put 1300 px of track inside a 1004 px container between 992
   and 1300, overflowing by up to 286 px on the homepage, About and Services.
   This is the same defect fixed on the contact page in milestone 10; the fix
   was never generalised. All five are now percentages of the 1300 px
   container, which reproduce the measured pixel widths exactly at 1440
   (640/570, 533/540, 660/640, 650/570, 650/650) and scale below it.
2. **Inactive hero slides were keyboard-reachable.** They carried
   `aria-hidden="true"` but still contained a focusable CTA link, so a
   keyboard user could tab into an invisible slide. They now also carry
   `inert`, set and cleared as slides change.
3. **Touch targets below 24 px** (WCAG 2.5.8). Hero dots were 8×8 on a 16 px
   pitch, testimonial dots 13×13 on 21 px. The visible dots are unchanged; a
   pseudo-element expands each target to 24×24 and the pitch went to 24 px so
   neighbouring targets touch rather than overlap, which the spacing exception
   requires.
4. **Three identical "Read More" links** on the homepage tiles, meaningless to
   anyone listening to a list of links. The visible text is unchanged; a
   visually hidden suffix names the destination.

Plus two smaller ones: the sidebar post counts were `text-body/70`, which
resolves to #9C9C9C at **2.74:1**, and carousel icons were shipping a 300 px
source for a 50 px slot.

**Weight.** Heaviest first load is 194 KB against a 500 KB target.

| Route                           | First load |
| ------------------------------- | ---------- |
| `/services/mortgage-solutions/` | 194 KB     |
| `/`                             | 193 KB     |
| `/about/`                       | 60 KB      |
| `/contact/`                     | 33 KB      |

**Responsive: 61 page/viewport combinations, zero overflow**, across 375, 390,
768, 1024, 1440 and 1920. The correct assertion is `body.scrollWidth` against
the viewport, not `documentElement.scrollWidth` — the preview pane reports an
`innerWidth` 45 px wider than `clientWidth` on the homepage, and the fixed
WhatsApp and back-to-top buttons anchor to the inflated value. That reads as a
45 px overflow and is not one.

**Known and accepted: 35 KB of the homepage's GSAP is unused.** GSAP earns its
place there for the hero, both carousels and the accordion, and the brief
names it in the stack, so it stays. It is the single largest remaining saving
if you ever want the homepage at 99 like everything else.

**Not done: cross-browser testing.** Chrome is covered by the Lighthouse runs.
Safari, Firefox and iOS Safari need a human on a real machine. The specific
things worth clicking are listed in the handover.

### Handover — Milestone 15 COMPLETE

- [x] Mail delivery implemented and verified end to end
- [x] reCAPTCHA v3 wired on both forms, lazily loaded
- [x] `.env.example` documenting every variable
- [x] `README.md` and `SANITY.md`

**Mail is no longer a TODO.** The endpoint previously validated and logged but
had a comment where the send belonged, which would have left the client unable
to receive anything the moment credentials arrived. `nodemailer` is now
installed and `src/pages/api/contact.ts` sends for real.

Verified against a local SMTP sink, both paths:

|                 | Result                                               |
| --------------- | ---------------------------------------------------- |
| Contact enquiry | `{"ok":true,"delivered":true}`, message received     |
| CV upload       | `multipart/mixed`, attachment `cv-test.pdf` received |
| `From`          | the SMTP account                                     |
| `Reply-To`      | the visitor — `Sara Malik <sara@example.com>`        |
| `To`            | `CONTACT_TO`                                         |

The visitor's address goes in `Reply-To` and never in `From`: sending as them
fails SPF and DMARC on most providers, which is the standard way contact forms
end up in spam folders.

**A latent bug found while wiring reCAPTCHA.** The CV modal never sent a token.
The endpoint rejects a submission when a secret is configured but no token
arrives, so the CV form would have broken the day the client added their keys —
and only then. Both forms now use one helper, `src/lib/recaptcha.ts`.

That helper loads the reCAPTCHA script **lazily, on the first submit that needs
a token**, rather than on every page. It is roughly 100 KB of third-party
JavaScript and most visitors never trigger it; loading it up front would have
undone much of milestone 12.

**Everything is inert until configured.** With no environment variables the
site builds, both forms validate and submit, and the visitor is told plainly
that nothing was delivered. Adding credentials is a deployment change, not a
code change.

**Endpoint behaviour, verified:**

| Request                         | Response                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------ |
| Valid, no SMTP                  | 200 `{ok:true, delivered:false, reason:"SMTP credentials are not configured"}` |
| Valid, SMTP set                 | 200 `{ok:true, delivered:true}`                                                |
| Invalid fields                  | 422 with per-field errors                                                      |
| Honeypot filled                 | 200 `{ok:true, delivered:false, reason:"Discarded."}`                          |
| CV with no file                 | 422                                                                            |
| `GET`                           | 405                                                                            |
| POST without an `Origin` header | 403 — Astro's CSRF check, on by default                                        |

**Docs.** `README.md` covers setup, the six things blocking launch, environment
variables, going live and the indexing switch, architecture, conventions worth
knowing, and how to reproduce the Lighthouse numbers. `SANITY.md` maps every
collection to its future document type field for field, sequences the swap, and
flags the two parts that need real thought (image handling and Portable Text).

### UI refinement and QA pass — COMPLETE

Full audit of UI, spacing, responsiveness, SEO, accessibility and performance,
then fixes. Four real bugs found, all the same underlying fault.

**The fault: fixed pixel offsets at `lg`, sized for 1440.** Between 992 and
about 1190 there is not enough room for them, and they either collide with the
adjacent column or spill out of their container. This had already been fixed
twice — the contact page in milestone 10, five grid tracks in milestone 14 —
without being generalised. It is now fixed everywhere and worth remembering as
the single most common defect in this build.

| #   | Where                          | Symptom                                                                                                                                                    | Fix                                                                                                                                                                                                                                                                                 |
| --- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | EMI calculator, below 576px    | The number input collapsed to 18px and the unit chip (AED / % / Yr-Mo) sat outside the card. **The headline interactive feature was unusable on a phone.** | The label goes full width below 576px, but the control beside it had `flex-1`, which resolves to `flex-basis: 0%` and therefore never wraps — it just collapsed. Given `flex: 1 0 100%` it wraps onto its own line and fills the row, which is what the label rule always intended. |
| 2   | Homepage About split, 992–1190 | Second image overlapped the copy by up to 111px                                                                                                            | Offsets and widths as percentages of the wrapper                                                                                                                                                                                                                                    |
| 3   | About page inset, 992–1190     | Absolutely positioned image overlapped the copy by up to 77px, clipping the first character of every heading line                                          | `left` and `width` as percentages of the column                                                                                                                                                                                                                                     |
| 4   | FAQ collage inset, 992–1190    | Absolutely positioned image overlapped the accordion                                                                                                       | `left` and `width` as percentages of the column                                                                                                                                                                                                                                     |

**All four preserve the 1440 design exactly.** Verified by measurement after
each change:

| Element               | Before                              | After     |
| --------------------- | ----------------------------------- | --------- |
| EMI label / control   | 203 / 275                           | 203 / 275 |
| Homepage split images | x=70 w=420, x=240 w=420, offset 210 | identical |
| About inset           | x=220, 420 wide                     | identical |
| FAQ inset             | 370 from column, 200x200            | identical |

Fixing #2 exposed a subtlety: the grid gives each child `pl-[10px]`, so a
590px wrapper only has a 580px content box, and percentages landed 7px short.
Widening the wrapper to 600px at `lg` restores a 590px content box, which is
exactly the span the image pair occupies (x=70 to x=660). The percentages now
sum to 100%, so the second image can never push past the column again.

**Audit coverage, and what came back clean:**

| Check                                | Result                                                                              |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| Horizontal overflow                  | 89 page/viewport combinations across 320/375/390/430/768/1024/1280/1440/1920 — zero |
| Column overlap                       | Every multi-column grid on every page at 992–1920 — zero after fixes                |
| Section-to-section spacing           | No accidental gaps; every adjacent section butts at 0                               |
| Trailing margins inside padded boxes | None                                                                                |
| Container alignment                  | Consistent per page                                                                 |
| Child overflowing its parent         | None                                                                                |
| Text overflowing its own box         | None                                                                                |
| Console errors / failed requests     | Zero on every page                                                                  |
| Canonicals                           | All 14 match their route                                                            |
| Trailing slashes                     | Consistent on every internal link                                                   |
| Sitemap                              | No stray URLs; only the placeholder privacy page excluded, deliberately             |
| Headings                             | One `h1` per page, no skipped levels                                                |
| Landmarks                            | `header`, `nav`, `main`, `footer` on every page                                     |
| JSON-LD                              | All blocks parse                                                                    |
| Image alt                            | Every image labelled or explicitly decorative                                       |
| Internal links                       | 360, none broken                                                                    |

**Lighthouse after the fixes** (production build, gzip): homepage 94 / 100 /
100 / 100, every other page 99 / 100 / 100 / 100, CLS 0 everywhere. The
homepage gained a point.

**Deliberately not changed.** Section padding varies across the site (110, 120,
30, 33, 45) because that is what the original Elementor layout does.
Normalising it would be a redesign, not a fix. One FAQ question wraps to two
lines and breaks after the hyphen in "non-standard"; the accordion row grows to
accommodate it, which is the design working, so the layout was left alone.
Several inline links measure 21–23px tall rather than 24px, which passes WCAG
2.5.8 through the spacing exception and is confirmed by Lighthouse at 100;
padding them would risk shifting layout for no measurable gain.

**Four audit findings that turned out to be false positives**, recorded so the
next pass does not chase them: the pane reports `innerWidth` 45px wider than
`clientWidth` on the homepage, so fixed-position buttons look like overflow
(assert on `body.scrollWidth`); `main section` matches the sidebar's nested
`<section class="widget">`, which looks like a section overlap; iterating
`cssRules` does not descend into `@layer`, so the global `:focus-visible` rule
looks absent; and `position: fixed` inside a full-height measurement frame
centres against the frame, not the viewport, so modals look mispositioned.

## Open Questions

These need your input. None of them block starting at Milestone 0; I have noted the assumption I will proceed with if you would rather decide later.

**Q1. Inner page banners.** **ANSWERED — restore the page title and breadcrumb.** Applies to all nine inner pages including the four service details. Resolves defects #2 and #3.

**Q3. EMI calculator.** **ANSWERED — show all three outputs, extend the months slider to 360.** Noting my reading of "extend the months slider from 360" as _to_ 360; tell me if you meant a different ceiling.

**Q2. Service slugs.** Fixing `commercial-finanaces` and shortening `lrd-section` / `lrd-construction-developer-finance` gives cleaner URLs, but those URLs currently 404 anyway so nothing is lost. _Assumption: adopt the clean slugs._

**Q4. Stock photography licensing.** The hero, about and FAQ images come from the theme author's demo server. Theme demo images are frequently not licensed for redistribution. I will localise them so the build is self-contained, but you should confirm licensing or swap in properly licensed images before production.

**Q5. Blog URL.** The blog index currently lives at `/blog-grid/`. `/blog/` is cleaner and that path is currently occupied by an unused demo page. _Assumption: use `/blog/`._

**Q6. Exclusion list.** Please confirm the 57 URLs in section B.3 are all disposable theme demo content.

**Q7. Blog search.** With two placeholder posts, a search box adds little. _Assumption: keep the sidebar but omit search until there is real content._

**Q8. Real content.** Both blog posts are placeholders, one is literal keyboard mash. Will real posts be supplied, or should the template ship with these?

**Q9. Analytics.** Google Site Kit is installed. Do you want GA4 in the Astro build, and under what consent model?

**Q10. Phone number.** Confirm the correct number. Evidence points to `+971 56 192 4606`.

**Q11. Service imagery.** All four service pages currently share one photo and one icon set. Will distinct images be supplied per service? _Assumption: build the template to support per-service images, ship with the shared photo until you provide replacements._

**Q12. Service page CTA.** The service detail pages end abruptly at the checklist with no call to action, which wastes the page's intent. _Assumption: add a consistent "Book a Free Consultation" CTA block at the end of the template, matching the existing button style._

**Q13. Missing banner images.** **ANSWERED — use the generic 1520x266 banners**
for Construction & Developer Finance and for the Blog.

**Q14. Blog comments.** The post template on WordPress ends with a comment
form. It is not carried over: a static build has nowhere to store comments,
the site has none, and a form that silently discarded input would be worse
than no form. The "Recent Comments" sidebar widget was dropped for the same
reason. _Assumption: the blog ships without comments._ If you want them, the
options are a hosted comments service or modelling them in Sanity with
moderation, and either is a scoped piece of work rather than a template tweak.

**Q15. Privacy policy content.** The WordPress page at `/privacy-policy-2/`
is the unedited WordPress default. Every section still opens "Suggested
text:", it names the theme author's demo domain (`finaxio.themeori.com`) as
the site owner, and it describes comments, Gravatar, login pages and media
uploads, none of which exist on this site. Publishing that for a UAE
financial-services firm would be inaccurate and a compliance risk, so it was
not carried over, and a replacement was not invented either. `/privacy-policy/`
is currently an honest holding page: it says the policy is being finalised,
lists what it will cover, and gives a real route for privacy enquiries. It is
`noindex` and excluded from the sitemap until you supply approved text.
**This needs your legal input before launch.**
