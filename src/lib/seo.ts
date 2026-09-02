import type { Site } from '../data/site';
import { SITE_URL, IS_PRODUCTION_HOST } from '../data/site-url.mjs';

/**
 * SEO fields as an editor sets them in the Studio.
 *
 * Every one is optional and every one falls back, so a page with an empty SEO
 * tab still emits correct tags. That is deliberate: spec §6 asks for sensible
 * defaults so editors do not have to fill everything, and a half-filled tab
 * must never produce a worse page than an empty one.
 */
export interface CmsSeo {
  // Each field is `?: T | undefined` rather than `?: T`, because these values
  // come from a Zod-inferred type and `exactOptionalPropertyTypes` treats
  // "absent" and "present and undefined" as different things.
  metaTitle?: string | undefined;
  metaDescription?: string | undefined;
  canonicalUrl?: string | undefined;
  /** Tighten-only. See `resolveSeo`. */
  noindex?: boolean | undefined;
  nofollow?: boolean | undefined;
  ogTitle?: string | undefined;
  ogDescription?: string | undefined;
  ogImage?: string | undefined;
  ogImageAlt?: string | undefined;
  twitterTitle?: string | undefined;
  twitterDescription?: string | undefined;
  twitterImage?: string | undefined;
  breadcrumbTitle?: string | undefined;
  /** Emits a WebPage node with this `@type` when set. */
  schemaType?: string | undefined;
}

export interface SeoInput {
  /** Page title without the site suffix. Omit on the homepage. */
  title?: string;
  /**
   * Hand-written meta description, 120–160 characters.
   *
   * The WordPress build had none: All in One SEO auto-scraped page text,
   * producing descriptions like "No testimonials found" and the gibberish
   * body of the dummy post (audit defect #22). Every page here supplies
   * its own.
   */
  description: string;
  /** Path with leading and trailing slash, e.g. `/about/`. */
  path: string;
  /** Absolute or root-relative image URL for Open Graph. */
  image?: string;
  type?: 'website' | 'article';
  /** Set true to exclude a page from indexing regardless of environment. */
  noindex?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  /** Overrides from the CMS. Each field falls back to the values above. */
  cms?: CmsSeo;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: 'website' | 'article';
  robots: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  twitterImage: string;
  /** Only present when the CMS image carries alt text. */
  imageAlt: string | undefined;
  // Explicit `| undefined` rather than `?`, because `exactOptionalPropertyTypes`
  // distinguishes "absent" from "present and undefined".
  publishedTime: string | undefined;
  modifiedTime: string | undefined;
  schemaType: string | undefined;
}

const DEFAULT_OG_IMAGE = '/og-default.png';

export function resolveSeo(input: SeoInput, site: Site): ResolvedSeo {
  const cms = input.cms ?? {};

  // The CMS title replaces the page's own, and the site name is still appended
  // so the suffix cannot be forgotten or duplicated by hand.
  const pageTitle = cms.metaTitle?.trim() || input.title;
  const title = pageTitle ? `${pageTitle} - ${site.name}` : `${site.name} - ${site.tagline}`;

  const description = cms.metaDescription?.trim() || input.description;

  // A canonical override has to be absolute. A relative one would resolve
  // against SITE_URL and silently point somewhere on this site, which defeats
  // the only reason to override it.
  const override = cms.canonicalUrl?.trim();
  const canonical =
    override && /^https?:\/\//.test(override) ? override : new URL(input.path, SITE_URL).href;

  const image = new URL(cms.ogImage ?? input.image ?? DEFAULT_OG_IMAGE, SITE_URL).href;
  const twitterImage = new URL(
    cms.twitterImage ?? cms.ogImage ?? input.image ?? DEFAULT_OG_IMAGE,
    SITE_URL,
  ).href;

  /**
   * Robots. The CMS may only ever tighten this.
   *
   * `IS_PRODUCTION_HOST` gates indexing and stays in code, so a staging build
   * is `noindex` no matter what any document says. On production, a page is
   * indexable unless the route asks otherwise or an editor ticks the box. There
   * is deliberately no way for content to force indexing on: a content edit that
   * deindexed the site would be bad, and one that indexed a staging build or a
   * page the route marked private would be worse.
   */
  const noindex = input.noindex === true || cms.noindex === true;
  const nofollow = cms.nofollow === true;
  const indexable = IS_PRODUCTION_HOST && !noindex;

  let robots: string;
  if (!indexable) {
    robots = 'noindex, nofollow';
  } else if (nofollow) {
    robots = 'index, nofollow, max-image-preview:large, max-snippet:-1';
  } else {
    robots = 'index, follow, max-image-preview:large, max-snippet:-1';
  }

  const ogTitle = cms.ogTitle?.trim() || title;
  const ogDescription = cms.ogDescription?.trim() || description;

  return {
    title,
    description,
    canonical,
    image,
    type: input.type ?? 'website',
    robots,
    ogTitle,
    ogDescription,
    twitterTitle: cms.twitterTitle?.trim() || ogTitle,
    twitterDescription: cms.twitterDescription?.trim() || ogDescription,
    twitterImage,
    imageAlt: cms.ogImageAlt?.trim() || undefined,
    publishedTime: input.publishedTime,
    modifiedTime: input.modifiedTime,
    schemaType: cms.schemaType?.trim() || undefined,
  };
}

/**
 * A `WebPage` node tying the page to the Organization graph.
 *
 * Only emitted when a page names its type, because an untyped `WebPage` node
 * says nothing a crawler cannot already see. The allowed types are a fixed list
 * in the Studio: `ContactPage` on a blog post would be false structured data,
 * and spec §6 rules that out explicitly.
 */
export function webPageSchema(seo: ResolvedSeo) {
  return {
    '@context': 'https://schema.org',
    '@type': seo.schemaType,
    '@id': `${seo.canonical}#webpage`,
    url: seo.canonical,
    name: seo.title,
    description: seo.description,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-AE',
  };
}

/**
 * Organization + WebSite graph, emitted once per page from BaseLayout.
 *
 * The site data is passed in rather than imported: it now comes from Sanity,
 * which is async, and threading a promise through here would make every caller
 * of this module async for no benefit. BaseLayout already awaits it once.
 */
export function organizationSchema(site: Site) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: site.name,
        url: SITE_URL,
        description: site.description,
        // An array only when there is a second number. Schema.org allows either,
        // and a one-element array for the common case would be noise.
        telephone: site.contact.landline
          ? [site.contact.phone.e164, site.contact.landline.e164]
          : site.contact.phone.e164,
        email: site.contact.email.address,
        address: {
          '@type': 'PostalAddress',
          streetAddress: site.contact.address.lines[0],
          addressLocality: 'Dubai',
          addressCountry: 'AE',
        },
        areaServed: { '@type': 'Country', name: 'United Arab Emirates' },
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: site.name,
        publisher: { '@id': `${SITE_URL}/#organization` },
        inLanguage: 'en-AE',
      },
    ],
  };
}

/** Breadcrumb trail. Pass the ancestor chain, excluding Home. */
export function breadcrumbSchema(trail: Array<{ name: string; path: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: new URL(item.path, SITE_URL).href,
    })),
  };
}

/**
 * FAQPage for the homepage accordion.
 *
 * Only valid because the answers are visible on the page — Google requires
 * the marked-up content to be present, and hiding it behind the accordion is
 * fine since the panels are in the DOM and reachable.
 */
export function faqSchema(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
