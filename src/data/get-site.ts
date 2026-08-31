import { site as defaults, type Site } from './site';
import { sanityClient, sanityEnabled } from '../lib/sanity/client';

/**
 * Site-wide data, from Sanity when it is configured and from `site.ts`
 * otherwise.
 *
 * The returned object has exactly the shape `site.ts` always had, so consumers
 * changed from `import { site }` to `const site = await getSite()` and nothing
 * else. Derived values — the `tel:`, `mailto:` and `wa.me` hrefs — are built
 * here rather than stored, which is the whole point: the WordPress site carried
 * three different phone numbers and malformed `tel:` links (audit defect #4),
 * and a single stored E.164 value makes that impossible.
 *
 * Anything absent in Sanity falls back to the value in `site.ts`, so a
 * half-filled singleton degrades field by field rather than emptying the header.
 *
 * The result is memoised: a static build otherwise refetches this for every
 * page, and the settings cannot change mid-build.
 */

let cached: Promise<Site> | undefined;

interface Link {
  label?: string;
  href?: string;
  hasChildren?: boolean;
}

interface SettingsDoc {
  name?: string;
  legalName?: string;
  tagline?: string;
  description?: string;
  phoneE164?: string;
  phoneDisplay?: string;
  email?: string;
  whatsappNumber?: string;
  addressLines?: string[];
  mapsUrl?: string;
  mapsEmbedQuery?: string;
  nav?: Link[];
  footerLinks?: Link[];
  legalLinks?: Link[];
  social?: Link[];
  ctaPrimary?: Link;
  ctaHeader?: Link;
  disclaimerFooter?: string;
  disclaimerCalculator?: string;
  creditText?: string;
  creditHref?: string;
}

const QUERY = `*[_type == "siteSettings" && !(_id in path("drafts.**"))][0]{
  name, legalName, tagline, description,
  phoneE164, phoneDisplay, email, whatsappNumber,
  addressLines, mapsUrl, mapsEmbedQuery,
  "nav": nav[]{ label, href, hasChildren },
  "footerLinks": footerLinks[]{ label, href },
  "legalLinks": legalLinks[]{ label, href },
  "social": social[]{ label, href },
  ctaPrimary{ label, href },
  ctaHeader{ label, href },
  disclaimerFooter, disclaimerCalculator, creditText, creditHref
}`;

/** Keeps only complete links, so a half-typed row cannot render a dead anchor. */
const links = (value: Link[] | undefined) =>
  (value ?? [])
    .filter((l): l is Link & { label: string; href: string } => Boolean(l?.label && l?.href))
    .map((l) => ({
      label: l.label,
      href: l.href,
      ...(l.hasChildren ? { hasChildren: true } : {}),
    }));

function merge(doc: SettingsDoc): Site {
  const e164 = doc.phoneE164 ?? defaults.contact.phone.e164;
  const email = doc.email ?? defaults.contact.email.address;
  const whatsapp = doc.whatsappNumber ?? defaults.contact.whatsapp.number;
  const addressLines =
    doc.addressLines && doc.addressLines.length
      ? doc.addressLines
      : [...defaults.contact.address.lines];

  const nav = links(doc.nav);
  const footerLinks = links(doc.footerLinks);
  const legalLinks = links(doc.legalLinks);
  const social = links(doc.social);

  return {
    name: doc.name ?? defaults.name,
    legalName: doc.legalName ?? doc.name ?? defaults.legalName,
    tagline: doc.tagline ?? defaults.tagline,
    description: doc.description ?? defaults.description,

    contact: {
      phone: {
        e164,
        href: `tel:${e164}`,
        display: doc.phoneDisplay ?? e164,
        compact: e164.replace(/\s/g, ''),
      },
      email: { address: email, href: `mailto:${email}` },
      whatsapp: { number: whatsapp, href: `https://wa.me/${whatsapp}` },
      address: {
        lines: addressLines,
        single: addressLines.join(', '),
        mapsUrl: doc.mapsUrl ?? defaults.contact.address.mapsUrl,
        mapsEmbedQuery: doc.mapsEmbedQuery ?? defaults.contact.address.mapsEmbedQuery,
      },
    },

    nav: nav.length ? nav : [...defaults.nav],
    footerLinks: footerLinks.length ? footerLinks : [...defaults.footerLinks],
    legalLinks: legalLinks.length ? legalLinks : [...defaults.legalLinks],

    cta: {
      primary: {
        label: doc.ctaPrimary?.label ?? defaults.cta.primary.label,
        href: doc.ctaPrimary?.href ?? defaults.cta.primary.href,
      },
      header: {
        label: doc.ctaHeader?.label ?? defaults.cta.header.label,
        href: doc.ctaHeader?.href ?? defaults.cta.header.href,
      },
    },

    disclaimers: {
      footer: doc.disclaimerFooter ?? defaults.disclaimers.footer,
      calculator: doc.disclaimerCalculator ?? defaults.disclaimers.calculator,
    },

    credit: {
      text: doc.creditText ?? defaults.credit.text,
      href: doc.creditHref ?? defaults.credit.href,
    },

    social,
  };
}

export async function getSite(): Promise<Site> {
  cached ??= (async () => {
    if (!sanityEnabled) return defaults;
    try {
      const doc = await sanityClient().fetch<SettingsDoc | null>(QUERY);
      if (!doc) {
        // Sanity is configured but the singleton has not been created yet.
        console.warn('[site] No siteSettings document found; using src/data/site.ts.');
        return defaults;
      }
      return merge(doc);
    } catch (error) {
      // Never fail a build over settings: a header with the committed values is
      // far better than no site at all.
      console.warn(
        '[site] Could not read siteSettings from Sanity; using src/data/site.ts.',
        error instanceof Error ? error.message : error,
      );
      return defaults;
    }
  })();
  return cached;
}
