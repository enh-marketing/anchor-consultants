import {
  site as defaults,
  type FooterButton,
  type Site,
  type SocialPlatform,
  type SocialProfile,
} from './site';
import type { CmsImageValue } from '../lib/sanity/image';
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

/** Image fields arrive already flattened by the GROQ projection below. */
interface SettingsImage {
  src?: string;
  assetId?: string;
  alt?: string;
  width?: number;
  height?: number;
  lqip?: string;
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
  businessHours?: string;
  logo?: SettingsImage;
  footerLogo?: SettingsImage;
  favicon?: SettingsImage;
  nav?: Link[];
  footerLinks?: Link[];
  legalLinks?: Link[];
  social?: Array<{ platform?: string; url?: string }>;
  blogSearchLabel?: string;
  blogSearchPlaceholder?: string;
  blogRecentTitle?: string;
  blogArchivesTitle?: string;
  blogCategoriesTitle?: string;
  blogFilterEmpty?: string;
  blogFilterReset?: string;
  footerPitch?: string;
  footerLinksTitle?: string;
  footerContactTitle?: string;
  footerButtons?: Array<{ label?: string; action?: string; dialog?: string; href?: string }>;
  ctaPrimary?: Link;
  ctaHeader?: Link;
  disclaimerFooter?: string;
  disclaimerCalculator?: string;
  creditText?: string;
  creditHref?: string;
}

const IMAGE = `{
  "src": asset->url,
  "assetId": asset->_id,
  "alt": coalesce(alt, ""),
  "width": asset->metadata.dimensions.width,
  "height": asset->metadata.dimensions.height,
  "lqip": asset->metadata.lqip
}`;

const QUERY = `*[_type == "siteSettings" && !(_id in path("drafts.**"))][0]{
  name, legalName, tagline, description,
  phoneE164, phoneDisplay, email, whatsappNumber,
  addressLines, mapsUrl, mapsEmbedQuery, businessHours,
  "logo": logo${IMAGE},
  "footerLogo": footerLogo${IMAGE},
  "favicon": favicon${IMAGE},
  "nav": nav[]{ label, href, hasChildren },
  "footerLinks": footerLinks[]{ label, href },
  "legalLinks": legalLinks[]{ label, href },
  "social": social[]{ platform, url },
  blogSearchLabel, blogSearchPlaceholder, blogRecentTitle, blogArchivesTitle,
  blogCategoriesTitle, blogFilterEmpty, blogFilterReset,
  footerPitch, footerLinksTitle, footerContactTitle,
  "footerButtons": footerButtons[]{ label, action, dialog, href },
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

/**
 * A Sanity image only counts as set once its asset resolves. A field that
 * exists but points at a deleted asset would otherwise render a broken image
 * where the local fallback would have worked.
 */
function image(value: SettingsImage | undefined): CmsImageValue | undefined {
  if (!value?.src) return undefined;
  return {
    src: value.src,
    ...(value.assetId ? { assetId: value.assetId } : {}),
    alt: value.alt ?? '',
    decorative: false,
    ...(value.width ? { width: value.width } : {}),
    ...(value.height ? { height: value.height } : {}),
    ...(value.lqip ? { lqip: value.lqip } : {}),
  } as CmsImageValue;
}

const PLATFORMS = new Set<SocialPlatform>([
  'facebook',
  'instagram',
  'linkedin',
  'x',
  'youtube',
  'tiktok',
]);

/**
 * Keeps only profiles with a known platform and a real URL.
 *
 * The platform drives the icon and the accessible name, so an unrecognised one
 * has nothing to render. Dropping it is better than a blank square linking
 * somewhere.
 */
function socials(value: SettingsDoc['social']): SocialProfile[] {
  return (value ?? []).flatMap((entry) => {
    const platform = entry?.platform as SocialPlatform | undefined;
    const url = entry?.url?.trim();
    return platform && PLATFORMS.has(platform) && url ? [{ platform, url }] : [];
  });
}

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

  // A button must be able to do something. A dialog action needs a dialog id
  // and a link action needs an href; a phone action needs neither, because it
  // derives from the canonical number. Anything else would render a button that
  // does nothing when clicked.
  const footerButtons: FooterButton[] = (doc.footerButtons ?? []).flatMap((b): FooterButton[] => {
    if (!b?.label) return [];
    if (b.action === 'dialog' && b.dialog) {
      return [{ label: b.label, action: 'dialog', dialog: b.dialog }];
    }
    if (b.action === 'link' && b.href) {
      return [{ label: b.label, action: 'link', href: b.href }];
    }
    if (b.action === 'phone') return [{ label: b.label, action: 'phone' }];
    return [];
  });

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
      hours: doc.businessHours ?? defaults.contact.hours,
    },

    nav: nav.length ? nav : [...defaults.nav],
    footerLinks: footerLinks.length ? footerLinks : [...defaults.footerLinks],
    legalLinks: legalLinks.length ? legalLinks : [...defaults.legalLinks],

    brand: {
      ...(image(doc.logo) ? { logo: image(doc.logo)! } : {}),
      ...(image(doc.footerLogo) ? { footerLogo: image(doc.footerLogo)! } : {}),
      ...(image(doc.favicon) ? { favicon: image(doc.favicon)! } : {}),
    },

    blog: {
      searchLabel: doc.blogSearchLabel ?? defaults.blog.searchLabel,
      searchPlaceholder: doc.blogSearchPlaceholder ?? defaults.blog.searchPlaceholder,
      recentTitle: doc.blogRecentTitle ?? defaults.blog.recentTitle,
      archivesTitle: doc.blogArchivesTitle ?? defaults.blog.archivesTitle,
      categoriesTitle: doc.blogCategoriesTitle ?? defaults.blog.categoriesTitle,
      filterEmpty: doc.blogFilterEmpty ?? defaults.blog.filterEmpty,
      filterReset: doc.blogFilterReset ?? defaults.blog.filterReset,
    },

    footer: {
      pitch: doc.footerPitch ?? defaults.footer.pitch,
      linksTitle: doc.footerLinksTitle ?? defaults.footer.linksTitle,
      contactTitle: doc.footerContactTitle ?? defaults.footer.contactTitle,
      buttons: footerButtons.length ? footerButtons : [...defaults.footer.buttons],
    },

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

    social: socials(doc.social),
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
