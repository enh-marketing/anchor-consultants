# Anchor Consultants — WordPress to Astro Migration Plan

**Reference site:** https://anchor.enhdemo.com/ (staging, WordPress)
**Target:** Astro + Tailwind CSS + GSAP + TypeScript, fully static output, all assets local
**Audit date:** 28 August 2026
**Last updated:** 28 August 2026, after permalink reset and client decisions on Q1/Q3
**Status:** Audit complete. Awaiting approval before implementation.

### Decisions locked

| Ref | Decision |
| --- | --- |
| Q1 | **Restore the page title and breadcrumb** in the inner page banner. This also resolves defects #2 and #3. |
| Q3 | **Show all three calculator outputs** (Loan EMI, Total Interest Payable, Total Payment) and **extend the months slider to 360**. |
| — | Permalinks were reset in WordPress on 28 Aug 2026. **Defect #1 is resolved at source**: all `service` and `portfolio` detail URLs now return 200. |

---

## A. Website Audit

### A.1 What the site actually is

The staging site runs the commercial **Finaxio** WordPress theme (v2.0.1) with its full demo content still installed. A subset of pages has been customised for Anchor Consultants, a UAE mortgage and real-estate finance advisory. The rest is untouched theme boilerplate.

The `lastmod` dates separate the two cleanly and this drove the scoping decision:

| Signal | Meaning |
| --- | --- |
| Modified 2026-02-23 / 2026-03-27 | Real Anchor content, actively edited |
| Modified 2025-12-29 | Bulk theme demo import |
| Modified 2023-08-09 / 2023-08-16 / 2025-04-02 | WordPress defaults and older leftovers |

This is corroborated by the live navigation, which links to only six destinations, and by the homepage, which links to nothing outside that set.

### A.2 Platform and plugin stack (all to be discarded)

| Component | Role on the site | Replacement approach |
| --- | --- | --- |
| Finaxio theme + finaxio-child | Layout, styling, JS | Rebuild in Astro + Tailwind |
| finaxio-toolkit | Theme widgets/elements | Rebuild as Astro components |
| Elementor + Elementor AI | Page builder for all main pages | Static Astro components |
| emi-calculator | EMI calculator widget | Rebuild from scratch in TypeScript |
| html-forms | Contact + CV forms | Astro form + server endpoint |
| popup-maker | Two modals | Custom dialog component |
| testimonial-free | Testimonial carousel | Custom carousel |
| click-to-chat-for-whatsapp | Floating WhatsApp button | Simple anchor + SVG |
| All in One SEO v5.0.1 | Meta tags, sitemap, schema | Astro SEO component + `@astrojs/sitemap` |
| LiteSpeed Cache | Caching | Not needed (static) |
| Google Site Kit | Analytics wiring | Optional, to be confirmed |

Front-end libraries currently loaded: jQuery 3.7.1, jQuery Migrate, Bootstrap 5, Swiper (two separate copies), Isotope, Waypoints, counterUp, Magnific Popup, MeanMenu, progressbar.js, rangeslider.js, Chart.js, animate.css. **No GSAP.**

### A.3 Performance baseline (homepage, uncached)

| Metric | Current |
| --- | --- |
| Total transfer | ~3.30 MB |
| HTML document | 168 KB |
| Sub-resources | 80 files, ~3.13 MB |
| Requests | 93 |
| TTFB | ~1.47 s |
| Load event | ~1.95 s |

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

| # | Severity | Defect | Recommended action |
| --- | --- | --- | --- |
| 1 | ~~High~~ **RESOLVED** | ~~All `service` and `portfolio` detail URLs return 404.~~ Permalinks were reset on 28 Aug 2026. All service and portfolio URLs now return 200 and the homepage "Read More" links resolve. | Done at source. Service detail template now audited — see section B.4. |
| 2 | High | **Inner page banners are broken on every page.** `.page__banner-content` is `display:none`, so the H1 and breadcrumb are hidden, and the background image is referenced over `http://` so browsers block it as mixed content. Result: a 226px empty grey band on About, Services, Testimonials, Contact, Blog **and all four service detail pages**. | **Decided (Q1): restore the title and breadcrumb**, serve the image over https. |
| 3 | High | **No visible H1 on any inner page** (direct consequence of #2). Note `mortgage-solutions` has no H1 in the markup at all, while the other three do. | Resolved by the Q1 decision. Add the missing title for Mortgage Solutions. |
| 4 | High | **Three different phone numbers.** Topbar `+971561924606`, contact page `+97156192460` (missing final digit), footer `+971 - 561924606`. All `tel:` hrefs are malformed as `tel:+971%20-%20561924606`. | Confirm the correct number, then use one canonical value with a clean `tel:+971561924606`. |
| 5 | High | **Header logo, hero slides, service icons, about and FAQ images are hotlinked from the theme author's demo server** `finaxio.nextwpcook.com`. The site breaks if that server goes away or blocks hotlinking. Also a licensing exposure. | Download locally. Flag the stock photography for licence review — see Open Questions Q4. |
| 6 | Medium | `Discover More` on the homepage points to `/~anchor/about/`, a leftover subdirectory install path. | Point to `/about/`. |
| 7 | Medium | Footer `Privacy Policy` links to `#`. A privacy page exists at `/privacy-policy-2/` but is unlinked. | Wire up a real privacy page. |
| 8 | Medium | Footer `FAQ` links to `/faq`, which is an unstyled theme demo page. | Link to the homepage FAQ section or build a real FAQ page. |
| 9 | Medium | **Blog sidebar has duplicate widgets** — Recent Posts appears twice (`block-3` and `csf_recent_post_widget-1`), Archives twice (`block-5`, `block-7`), and there are two search forms. | Build one clean sidebar. |
| 10 | Medium | EMI calculator: the **months tenure slider maxes at 30 months**, while the years slider goes to 30 years. | **Decided (Q3): extend to 360 months.** |
| 11 | Medium | EMI calculator hides **Total Interest Payable** and **Total Payment**, though both are computed correctly. Chart.js is loaded for a chart that does not exist. | **Decided (Q3): show all three outputs.** Chart.js still dropped. |
| 12 | Low | Number formatting inconsistent in the calculator: `21370 AED` vs `71,370 AED`. | Consistent thousands separators. |
| 13 | Low | Five images carry the literal alt text `"No alt text"`. Thirteen have empty alt. | Write real alt text. |
| 14 | Low | Heading hierarchy is broken: 6 `<h1>` elements (5 visible) on the homepage, and jumps from H2 straight to H4/H5/H6. | One H1 per page, sequential levels. |
| 15 | Low | 16 form inputs have no associated `<label>`; placeholders are used as labels. Email and phone fields use `type="text"`. | Real labels, correct input types. |
| 16 | Low | No `aria-expanded` anywhere. The FAQ accordion and mobile menu are not announced to screen readers. | Proper ARIA state. |
| 17 | Low | No skip-to-content link. | Add one. |
| 18 | Low | Typo in body copy: `"Call us 24/7. We can answer for all your questions.b"` (trailing `b`). | Fix. |
| 19 | Low | Service slug typo: `commercial-finanaces`. | See Open Questions Q2. |
| 20 | Low | Leftover demo contacts in hidden markup: `tel:123456789`, `mailto:info@webmail.com`. Hidden social links point to bare `http://x.com` and `http://youtube.com`. | Omit, or wire to real profiles. |
| 21 | Info | Every page is `noindex, nofollow`. Correct for staging, but must not ship to production. | Make robots policy environment-driven. |
| 22 | Info | No hand-written meta descriptions. All are auto-scraped by AIOSEO, producing text like `"No testimonials found"` and the gibberish body of the dummy post. | Write real descriptions for all pages. |
| 23 | Medium | **All four service detail pages use the identical hero photo** (`service-1.jpg`) and the identical three card icons (`services-4/5/6.png`). Only the labels and body copy differ. | Content gap, not a build problem. Template will support per-service imagery so it is a content edit later. See Q11. |
| 24 | Medium | **Service detail pages are structurally inconsistent.** Three have three feature cards plus a checklist; Lease Rental Discounting has neither and is two sentences long. | Build one flexible template where cards and checklist are optional. |
| 25 | Low | White gap renders below the copyright bar on short service pages; the footer does not fill the viewport. | Sticky footer via flex layout. |

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

| # | Route | Source | Template | Notes |
| --- | --- | --- | --- | --- |
| 1 | `/` | page ID 12 `home-one` | Home | 12 visible sections, 6239px tall at 1440w |
| 2 | `/about/` | page ID 23 | Inner | Short page, 2541px |
| 3 | `/services/` | page ID 26 | Inner | 4 service cards + skills section, 2256px |
| 4 | `/testimonials/` | page ID 118 | Inner | 7 testimonials in a grid, 1658px |
| 5 | `/contact/` | page ID 33 | Inner | Map, contact info, form, 2413px |
| 6 | `/blog/` | page ID 36 `blog-grid` | Blog index | 2 posts + sidebar. **Route rename proposed** — see Q5 |
| 7 | `/blog/[slug]/` | 2 posts | Post | Both posts are placeholder content |
| 8 | `/services/[slug]/` | 4 service CPT entries | Service detail | **Currently 404. New pages.** |
| 9 | `/404` | — | Error | Currently a WordPress 404 |

Plus non-page routes: `/sitemap.xml`, `/robots.txt`.

### B.2 Real services (4)

| Title | Current slug | Proposed slug |
| --- | --- | --- |
| Mortgage Solutions | `mortgage-solutions` | `mortgage-solutions` |
| Commercial Finances | `commercial-finanaces` | `commercial-finances` (typo fix, Q2) |
| Construction & Developer Finance | `lrd-construction-developer-finance` | `construction-developer-finance` (Q2) |
| Lease Rental Discounting | `lrd-section` | `lease-rental-discounting` (Q2) |

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

| Service | H1 in markup | Feature cards | Checklist |
| --- | --- | --- | --- |
| Mortgage Solutions | **Missing** | Loan Profiling, Rate Structuring, Funding Delivery | 7 items |
| Commercial Finances | Yes | Asset Evaluation, Capital Sourcing, Deal Execution | Yes |
| Construction & Developer Finance | Yes | Escrow Strategy, Milestone Funding, Portfolio Scaling | Yes |
| Lease Rental Discounting | Yes | **None** | **None** |

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

| Component | Detail |
| --- | --- |
| `TopBar` | Navy `#084876`, 46px. Email + phone left, "Financing made simple" right. Wraps to 2 lines on mobile. |
| `Header` | White, 90px. Logo left, 6-item nav centre, "Lets Connect" button right. **Not sticky.** |
| `MobileNav` | MeanMenu-style inline accordion that pushes content down. Activates below 992px. Not an offcanvas drawer. |
| `Footer` | Navy. Logo + tagline + blurb, Quick Links, Contact Us with 2 buttons. |
| `FooterDisclaimer` | Navy strip: "Financing is subject to bank policy, eligibility, and final approval." |
| `CopyrightBar` | Dark `#1E1F21`, 66px. Credit line left, FAQ + Privacy Policy right. |
| `WhatsAppButton` | Fixed, bottom 85px / right 19px, z-index very high. Number `971561924606`. |
| `ScrollToTop` | Fixed circular button, appears after scroll. |
| `ContactModal` | Name, email, phone, message. |
| `CvUploadModal` | File upload, required. |

### C.2 Homepage sections (12 visible, in order)

| # | Component | Key detail |
| --- | --- | --- |
| 1 | `HeroCarousel` | 3 slides, Swiper fade, 6s autoplay, loop, 300ms. Eyebrow pill, H1 at 80px/700, paragraph, CTA. |
| 2 | `ServiceHighlightRow` | 3 tiles (Home Loan / Commercial Finance / Construction & Developer Finance), middle tile blue, photo backgrounds. 3s autoplay carousel below 992px. |
| 3 | `AboutSplit` | Two overlapping images left, "Real-World Banking Experience" right, `Discover More` CTA. |
| 4 | `ServicesCarousel` | "What We Offer for You". Swiper, 3 per view, loop, 4s autoplay, 1500ms. Background photo, elevated centre card. |
| 5 | `EmiCalculator` | See section D.3. |
| 6 | `LeaderProfile` | "Our Leader" — Samaira Nichani, Managing Director & Founder. |
| 7 | `AppointmentCta` | "You can request an appointment to discuss your financing options." |
| 8 | `FaqAccordion` | 6 items, first open. Two decorative images left. |
| 9 | `TestimonialCarousel` | "User Feedback". 5 shown, 3 per view, loop, 3s autoplay, 600ms, arrows + dots. |
| 10 | `Footer` group | As above. |

### C.3 Inner page components

| Component | Used on |
| --- | --- |
| `PageBanner` | All inner pages (currently broken, see defect #2) |
| `ServiceCard` | Services page — icon, title, "Read More →" |
| `SkillBars` | Services — "Strategy is at the Heart of Growth", Financial Advisory 63%, Market Analysis 60%, animated |
| `TestimonialGrid` | Testimonials page — 7 items |
| `ContactInfoList` | Contact — 3 rows with right-aligned icons |
| `ContactForm` | Contact — Full Name, Email, Phone, Question, Submit Now |
| `GoogleMap` | Contact — iframe, 1300x535, lazy |
| `PostCard` | Blog index |
| `BlogSidebar` | Search, Recent Posts, Recent Comments, Archives, Categories |

---

## D. Functionality Inventory

### D.1 Interactive features to rebuild

| Feature | Current implementation | Rebuild approach |
| --- | --- | --- |
| Hero carousel | Swiper, fade, 6s, loop | GSAP crossfade + custom logic, or a small custom slider |
| Service highlight carousel | Swiper, 3s, 3/view, no loop | Custom, CSS scroll-snap below 992px |
| Services carousel | Swiper, 4s, 3/view, loop, arrows | Custom carousel component |
| Testimonial carousel | Swiper, 3s, 3/view, loop, arrows + dots | Same component, different data |
| FAQ accordion | Bootstrap collapse | Native `<details>` or custom with proper ARIA |
| Mobile navigation | MeanMenu | Custom, matching push-down behaviour |
| EMI calculator | emi-calculator plugin | TypeScript, see D.3 |
| Contact form | html-forms | Astro form + `/api/contact` endpoint |
| CV upload form | html-forms + Popup Maker | Same endpoint, multipart |
| Contact modal | Popup Maker | Native `<dialog>` |
| CV modal | Popup Maker | Native `<dialog>` |
| Scroll-to-top | Theme JS | Small script + GSAP |
| WhatsApp button | Plugin | Static anchor |
| Skill/progress bars | progressbar.js + Waypoints | GSAP ScrollTrigger |
| Blog search | WordPress search | Client-side filter over 2 posts, or omit (Q7) |
| Smooth scroll | `scroll-behavior: smooth` | Same, plus reduced-motion guard |

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

| Control | Type | Min | Max | Default | Unit |
| --- | --- | --- | --- | --- | --- |
| Loan Amount | number + range | 5,000 | 10,000,000 | 50,000 | AED |
| Interest Rate | number + range | 1 | 30 | 15 | % |
| Loan Tenure (years) | number + range | 1 | 30 | 5 | Yr |
| Loan Tenure (months) | number + range | 6 | **30** | 6 | Mo |

Yr/Mo is a radio pair (`emi_months_years`) that swaps which slider is active.

Formula (standard amortisation), verified against the live output:

```
r = annualRate / 12 / 100
n = tenure in months
EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
```

Verification: P=50,000, rate=15%, n=60 gives EMI = 1,189.35, total payment 71,361, total interest 21,361. The live site displays 1189 / 71,370 / 21,370, matching within its own rounding.

Outputs: **Loan EMI** (shown), **Total Interest Payable** (hidden), **Total Payment** (hidden).

Rebuild notes: number and slider stay in sync both ways, debounced recalculation, `Intl.NumberFormat('en-AE')` for consistent formatting, full keyboard support, ARIA on the sliders. The 30-month cap and the hidden rows need a decision (Q3).

---

## E. Asset Inventory

All assets must be downloaded and served locally. 42 unique assets are referenced by the live pages.

### E.1 Hotlinked from the theme demo server (must be localised)

Source: `https://finaxio.nextwpcook.com/wp-content/uploads/2023/08/`

| File | Size | Used for |
| --- | --- | --- |
| `logo.png` | 15 KB | Header logo |
| `banner-1.png` | 194 KB | Hero slide 1 |
| `banner-2.png` | 188 KB | Hero slide 2 |
| `banner-3.png` | 159 KB | Hero slide 3 |
| `about-1.jpg` | 27 KB | About split image |
| `about-2.jpg` | 34 KB | About split image |
| `services-7.png` | 14 KB | Service icon |
| `services-8.png` | 11 KB | Service icon |
| `services-9.png` | 4 KB | Service icon |
| `faq-3.jpg` | 34 KB | FAQ decorative |
| `faq-4.jpg` | 13 KB | FAQ decorative |

All return 200 and are downloadable.

### E.2 Hosted on the Anchor server

| File | Size | Used for |
| --- | --- | --- |
| `2025/12/anchor_consultants.png` | 63 KB | Real Anchor logo, og:image |
| `2026/01/pp23-removebg-preview.png` | 161 KB | Samaira Nichani portrait |
| `2026/01/ms-removebg-preview.png` | — | Mortgage Solutions icon |
| `2026/01/cf-removebg-preview.png` | — | Commercial Finances icon |
| `2026/01/Untitled_design-removebg-preview.png` | — | Construction icon |
| `2026/01/Untitled_design__1_-removebg-preview.png` | — | LRD icon |
| `2026/02/1.webp`, `2.jpg`, `3.webp`, `4.webp` | — | Inner page banners (currently blocked) |
| `2023/08/history-two.jpg` | 44 KB | Blog featured image |
| `2023/08/about.jpg`, `about-1.jpg`, `plan.jpg`, `arrow.png`, `call.png`, `banner-bg.jpg`, `services.jpg` | — | Section backgrounds and decorations |
| `2023/08/history-one/three/four.jpg` | — | About timeline (hidden) |
| `2023/08/favicon-2.png` | — | Favicon |

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

| Token | Value | Usage |
| --- | --- | --- |
| `primary` | `#084876` | Topbar, footer, buttons, headings accent |
| `primary-light` | `#2A78C0` | Secondary blue, middle highlight tile |
| `accent` | `#0E6C90` | Occasional accent |
| `accent-alt` | `#1595CE` | Occasional accent |
| `ink` | `#1C1E22` | Headings |
| `ink-soft` | `#333333` | Strong body text |
| `body` | `#777777` | Default body text (363 elements) |
| `surface` | `#FFFFFF` | Cards, header |
| `surface-alt` | `#F7F7F7` | Alternating section background |
| `dark` | `#1E1F21` | Copyright bar |
| `border` | `#E6E6E6` / `#D6D6D6` / `#CCCCCC` | Dividers |
| `warning` | `#EC1113` | Single error/red usage |

Service icons use an orange/amber family that needs sampling from the source SVG/PNG during implementation.

### F.2 Typography

Single family: **DM Sans**. Body 16px / 26px line-height (1.625).

| Role | Size / Weight | Notes |
| --- | --- | --- |
| Hero H1 | 80px / 700 | Desktop |
| Section H2 | 60px / 700 | "What We Offer for You", "User Feedback" |
| Sub-heading | 30px / 700 | |
| Card title | 24px / 700 | |
| Body | 16px / 400 | Dominant (398 elements) |
| Body medium | 16px / 500 | |
| Body bold | 16px / 700 | |
| Large body | 18px / 400 | |
| Small | 15px / 700, 14px / 400 | Meta, labels |

### F.3 Layout and spacing

- Bootstrap 5 grid. Container max-widths follow Bootstrap defaults; to be confirmed per breakpoint during implementation.
- Section vertical padding is inconsistent across sections: observed `110px/30px`, `30px/0`, `30px/30px`, `80px/10px`, `10px/10px`. Recommend normalising to a small scale while preserving visual rhythm.
- Cards use white surfaces with subtle shadows and small radii.

### F.4 Breakpoints

Bootstrap 5 aligned, confirmed from the theme stylesheet:

| Breakpoint | Query count | Role |
| --- | --- | --- |
| 1399px | 12 | xxl |
| 1199px | 13 | xl |
| **991px** | **15** | **lg — primary desktop/mobile switch, mobile nav activates** |
| 767px | 5 | md |
| 575px | 6 | sm |
| 440 / 430 / 396 / 390 / 385 / 359px | 1 each | Ad-hoc patch breakpoints |

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

| Animation | Current | GSAP rebuild |
| --- | --- | --- |
| Section reveals | `animated fadeInLeft` (15 elements), `fadeInRight` (5) | ScrollTrigger fade + 30px offset, 0.6s, stagger |
| Hero slide transition | Swiper fade, 300ms, 6s interval | GSAP crossfade timeline |
| Services carousel | Swiper slide, 1500ms, 4s interval | GSAP-driven translate |
| Testimonial carousel | Swiper slide, 600ms, 3s interval | Same component |
| Skill bars | progressbar.js + Waypoints, to 63% / 60% | ScrollTrigger width tween |
| Scroll-to-top | Class toggle | Fade/scale in past threshold |
| FAQ accordion | Bootstrap collapse | GSAP height auto tween |
| Hover states | CSS transitions on buttons, cards, links | Keep as CSS, do not move to JS |

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

| Collection | Fields | Future Sanity type |
| --- | --- | --- |
| `services` | title, slug, icon, summary, body, order, seo | `service` |
| `testimonials` | name, location, quote, order | `testimonial` |
| `faqs` | question, answer, order | `faq` |
| `posts` | title, slug, date, author, excerpt, image, body | `post` |
| `team` | name, role, bio, photo | `teamMember` |
| `siteSettings` | contact, nav, social, disclaimers | `siteSettings` singleton |

Because every page reads through a thin data layer rather than importing files directly, switching to Sanity later means changing the loader, not rewriting pages.

### H.4 Deployment

Static output plus one server route. Adapter choice is deferred until you pick hosting; it is a one-line config change. Local development runs the endpoint in the dev server, so nothing is blocked in the meantime.

---

## I. Migration Roadmap

Each milestone ends with a visual comparison against the WordPress original before moving on.

| # | Milestone | Deliverable |
| --- | --- | --- |
| 0 | **Project setup** | Astro + Tailwind + TS + GSAP scaffold, git repo, Tailwind theme with the tokens from section F, DM Sans self-hosted, base layout |
| 1 | **Asset acquisition** | All 42 assets downloaded, organised, optimised. Nothing pointing at WordPress or the theme demo server. |
| 2 | **Global chrome** | TopBar, Header, MobileNav, Footer, disclaimer, copyright bar, WhatsApp, scroll-to-top. Correct at all 5 viewports. |
| 3 | **Design system** | Button, Card, Container, Section, headings, Icon set as inline SVG |
| 4 | **Homepage part 1** | Hero carousel, service highlight row, about split |
| 5 | **Homepage part 2** | Services carousel, leader, appointment CTA |
| 6 | **EMI calculator** | Full rebuild with unit tests on the maths |
| 7 | **Homepage part 3** | FAQ accordion, testimonial carousel. Homepage complete. |
| 8 | **Inner pages** | About, Services, Testimonials |
| 9 | **Service detail pages** | 4 new pages, fixing defect #1 |
| 10 | **Contact + forms** | Contact page, both modals, validation, reCAPTCHA v3 hooks, `/api/contact` stub |
| 11 | **Blog** | Index, post template, clean sidebar, 404 page |
| 12 | **Animation pass** | GSAP reveals, ScrollTrigger, reduced-motion, performance tuning |
| 13 | **SEO + accessibility** | Meta, canonicals, OG, JSON-LD, sitemap, robots, heading hierarchy, labels, ARIA, skip link, keyboard audit |
| 14 | **Performance + QA** | Lighthouse, cross-browser, 5 viewports, final side-by-side comparison |
| 15 | **Handover** | SMTP + reCAPTCHA keys wired, Sanity migration notes, README |

---

## J. Migration Checklist

Updated continuously. `[ ]` pending, `[x]` done, `[~]` in progress, `[!]` blocked.

### Setup
- [ ] Astro project initialised
- [ ] Git repository initialised
- [ ] Tailwind 4 configured with Anchor tokens
- [ ] Bootstrap-aligned breakpoints configured
- [ ] TypeScript strict mode
- [ ] GSAP + ScrollTrigger installed
- [ ] DM Sans self-hosted (400/500/600/700)
- [ ] Prettier + ESLint
- [ ] Content collection schemas defined

### Assets
- [ ] 11 theme-demo images downloaded and localised
- [ ] Anchor-hosted images downloaded
- [ ] Logo (both variants)
- [ ] Favicon
- [ ] Service icons extracted as SVG
- [ ] UI icons inlined as SVG
- [ ] Images converted to WebP/AVIF
- [ ] Real alt text written for every image
- [ ] Zero references to WordPress or `finaxio.nextwpcook.com`

### Global components
- [ ] TopBar
- [ ] Header + nav
- [ ] Mobile nav (below 992px, push-down behaviour)
- [ ] Footer
- [ ] Footer disclaimer strip
- [ ] Copyright bar
- [ ] WhatsApp button (no text overlap on mobile)
- [ ] Scroll-to-top
- [ ] Skip-to-content link

### Homepage
- [ ] Hero carousel (3 slides, fade, 6s)
- [ ] Service highlight row
- [ ] About split
- [ ] Services carousel
- [ ] EMI calculator
- [ ] Leader profile
- [ ] Appointment CTA
- [ ] FAQ accordion (6 items)
- [ ] Testimonial carousel
- [ ] Visual comparison signed off

### Inner pages
- [ ] Page banner resolved (see Q1)
- [ ] About
- [ ] Services
- [ ] Service detail x4
- [ ] Testimonials (7)
- [ ] Contact
- [ ] Blog index
- [ ] Post template
- [ ] Blog sidebar (deduplicated)
- [ ] 404

### Forms
- [ ] Contact form with real labels
- [ ] Correct input types
- [ ] Client-side validation + `aria-live` errors
- [ ] Honeypot
- [ ] Contact modal
- [ ] CV upload modal with type + size limits
- [ ] `/api/contact` endpoint
- [ ] reCAPTCHA v3 integration point
- [ ] SMTP integration point
- [ ] End-to-end test once keys arrive

### Animation
- [ ] GSAP reveal system
- [ ] ScrollTrigger reveals
- [ ] Skill bars
- [ ] Accordion tween
- [ ] Carousel motion
- [ ] `prefers-reduced-motion` honoured throughout
- [ ] Content never permanently hidden if JS fails
- [ ] Autoplay pauses on hover/focus/off-screen

### Defect fixes
- [ ] #1 Service detail pages exist (no 404s)
- [ ] #2 Inner banners resolved
- [ ] #3 One visible H1 per page
- [ ] #4 Single canonical phone number, valid `tel:`
- [ ] #5 No hotlinked assets
- [ ] #6 `Discover More` points to `/about/`
- [ ] #7 Privacy Policy linked
- [ ] #8 FAQ link resolved
- [ ] #9 Sidebar deduplicated
- [ ] #10 Months slider range corrected
- [ ] #11 Calculator output rows resolved
- [ ] #12 Consistent number formatting
- [ ] #13 Real alt text
- [ ] #14 Heading hierarchy correct
- [ ] #15 Labels + input types
- [ ] #16 `aria-expanded` present
- [ ] #17 Skip link
- [ ] #18 `questions.b` typo fixed
- [ ] #19 Slug typo resolved
- [ ] #20 Demo contacts removed
- [ ] #21 Robots policy environment-driven
- [ ] #22 Real meta descriptions on all pages
- [ ] No dead/hidden markup carried over

### SEO
- [ ] Unique titles
- [ ] Hand-written meta descriptions
- [ ] Canonicals
- [ ] Open Graph + Twitter cards
- [ ] JSON-LD: Organization, WebSite, WebPage, BreadcrumbList, BlogPosting, FAQPage, Service
- [ ] `sitemap.xml` (no 404 URLs)
- [ ] `robots.txt`
- [ ] Internal links all resolve

### Accessibility
- [ ] Keyboard navigable throughout
- [ ] Visible focus states
- [ ] Contrast checked (note: `#777` on white is 4.48:1, passes AA for normal text but is marginal)
- [ ] Carousels keyboard + screen-reader usable
- [ ] Modals: focus trap, Esc, restore focus
- [ ] Forms fully labelled
- [ ] Landmarks correct
- [ ] Tested with a screen reader

### Responsive
- [ ] 375 / 390px mobile
- [ ] 768px tablet
- [ ] 1024px laptop
- [ ] 1440px desktop
- [ ] 1920px large desktop
- [ ] No horizontal scroll at any width

### Performance
- [ ] Homepage under 500 KB
- [ ] Lighthouse 90+ on all four categories
- [ ] LCP image preloaded
- [ ] Zero unused JS shipped
- [ ] Fonts subset with `font-display: swap`

### Final
- [ ] Side-by-side comparison, every page, every breakpoint
- [ ] Cross-browser (Chrome, Safari, Firefox, iOS Safari)
- [ ] Production build clean
- [ ] README written
- [ ] Sanity migration notes written

---

## Open Questions

These need your input. None of them block starting at Milestone 0; I have noted the assumption I will proceed with if you would rather decide later.

**Q1. Inner page banners.** **ANSWERED — restore the page title and breadcrumb.** Applies to all nine inner pages including the four service details. Resolves defects #2 and #3.

**Q3. EMI calculator.** **ANSWERED — show all three outputs, extend the months slider to 360.** Noting my reading of "extend the months slider from 360" as *to* 360; tell me if you meant a different ceiling.

**Q2. Service slugs.** Fixing `commercial-finanaces` and shortening `lrd-section` / `lrd-construction-developer-finance` gives cleaner URLs, but those URLs currently 404 anyway so nothing is lost. *Assumption: adopt the clean slugs.*

**Q4. Stock photography licensing.** The hero, about and FAQ images come from the theme author's demo server. Theme demo images are frequently not licensed for redistribution. I will localise them so the build is self-contained, but you should confirm licensing or swap in properly licensed images before production.

**Q5. Blog URL.** The blog index currently lives at `/blog-grid/`. `/blog/` is cleaner and that path is currently occupied by an unused demo page. *Assumption: use `/blog/`.*

**Q6. Exclusion list.** Please confirm the 57 URLs in section B.3 are all disposable theme demo content.

**Q7. Blog search.** With two placeholder posts, a search box adds little. *Assumption: keep the sidebar but omit search until there is real content.*

**Q8. Real content.** Both blog posts are placeholders, one is literal keyboard mash. Will real posts be supplied, or should the template ship with these?

**Q9. Analytics.** Google Site Kit is installed. Do you want GA4 in the Astro build, and under what consent model?

**Q10. Phone number.** Confirm the correct number. Evidence points to `+971 56 192 4606`.

**Q11. Service imagery.** All four service pages currently share one photo and one icon set. Will distinct images be supplied per service? *Assumption: build the template to support per-service images, ship with the shared photo until you provide replacements.*

**Q12. Service page CTA.** The service detail pages end abruptly at the checklist with no call to action, which wastes the page's intent. *Assumption: add a consistent "Book a Free Consultation" CTA block at the end of the template, matching the existing button style.*
