import { site } from '../data/site';
import { SITE_URL, IS_PRODUCTION_HOST } from '../data/site-url.mjs';

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
}

export interface ResolvedSeo {
  title: string;
  description: string;
  canonical: string;
  image: string;
  type: 'website' | 'article';
  robots: string;
  // Explicit `| undefined` rather than `?`, because `exactOptionalPropertyTypes`
  // distinguishes "absent" from "present and undefined".
  publishedTime: string | undefined;
  modifiedTime: string | undefined;
}

const DEFAULT_OG_IMAGE = '/og-default.png';

export function resolveSeo(input: SeoInput): ResolvedSeo {
  const title = input.title ? `${input.title} - ${site.name}` : `${site.name} - ${site.tagline}`;

  const canonical = new URL(input.path, SITE_URL).href;
  const image = new URL(input.image ?? DEFAULT_OG_IMAGE, SITE_URL).href;

  // Staging stays noindex. Only a production build may be indexed.
  const indexable = IS_PRODUCTION_HOST && !input.noindex;
  const robots = indexable
    ? 'index, follow, max-image-preview:large, max-snippet:-1'
    : 'noindex, nofollow';

  return {
    title,
    description: input.description,
    canonical,
    image,
    type: input.type ?? 'website',
    robots,
    publishedTime: input.publishedTime,
    modifiedTime: input.modifiedTime,
  };
}

/** Organization + WebSite graph, emitted once per page from BaseLayout. */
export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: site.name,
        url: SITE_URL,
        description: site.description,
        telephone: site.contact.phone.e164,
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
