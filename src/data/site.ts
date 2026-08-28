/**
 * Single source of truth for site-wide data.
 *
 * The WordPress build carried three different phone numbers, one of them
 * missing a digit, plus malformed `tel:` hrefs (audit defect #4). Defining
 * contact details once here makes that class of drift impossible.
 */

export interface NavItem {
  label: string;
  href: string;
}

/** Digits only, E.164, for `tel:` hrefs. */
const PHONE_E164 = '+971561924606';

export const site = {
  name: 'Anchor Consultants',
  legalName: 'Anchor Consultants',
  tagline: 'Financing made simple',
  description:
    'UAE mortgage and real-estate finance specialists. We compare leading UAE lenders and structure the right financing for buying, refinancing, building or unlocking equity.',

  contact: {
    /** TODO(client): confirm — audit Q10. Evidence points to +971 56 192 4606. */
    phone: {
      e164: PHONE_E164,
      href: `tel:${PHONE_E164}`,
      display: '+971 56 192 4606',
      /** Compact form used in the top bar on the original site. */
      compact: '+971561924606',
    },
    email: {
      address: 'info@anchor.enhdemo.com',
      href: 'mailto:info@anchor.enhdemo.com',
    },
    whatsapp: {
      number: '971561924606',
      href: 'https://wa.me/971561924606',
    },
    address: {
      lines: ['Office No: 37, Unique World', 'Oud Metha Plaza, Dubai, UAE'],
      single: 'Office No: 37, Unique World, Oud Metha Plaza, Dubai, UAE',
      mapsUrl: 'https://share.google/dhZtx2q6smETbWxYM',
      mapsEmbedQuery: '37, Unique World, Oud Metha Plaza, Dubai, UAE',
    },
  },

  /** Primary navigation. Flat, six items, no dropdowns — matches the original. */
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about/' },
    { label: 'Services', href: '/services/' },
    { label: 'Testimonials', href: '/testimonials/' },
    { label: 'Blog', href: '/blog/' },
    { label: 'Contact', href: '/contact/' },
  ] satisfies NavItem[],

  /** Footer "Quick Links" mirrors the primary nav on the original site. */
  footerLinks: [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about/' },
    { label: 'Services', href: '/services/' },
    { label: 'Testimonials', href: '/testimonials/' },
    { label: 'Blog', href: '/blog/' },
    { label: 'Contact', href: '/contact/' },
  ] satisfies NavItem[],

  /** Bottom bar. Privacy Policy pointed at `#` on the original (defect #7). */
  legalLinks: [
    { label: 'FAQ', href: '/#faq' },
    { label: 'Privacy Policy', href: '/privacy-policy/' },
  ] satisfies NavItem[],

  cta: {
    primary: { label: 'Book a Free Consultation', href: '/contact/' },
    header: { label: 'Lets Connect', href: '/contact/' },
  },

  disclaimers: {
    footer: 'Financing is subject to bank policy, eligibility, and final approval.',
    calculator:
      'Disclaimer : Estimates are indicative only and depend on bank approval and documentation.',
  },

  credit: {
    text: 'Copyright & Design By Diginfo',
    href: 'https://www.diginfoexpert.com/',
    year: 2025,
  },

  /**
   * The original markup contains hidden social links pointing at bare
   * `http://x.com` and `http://youtube.com` — placeholders, not real
   * profiles (audit defect #20). Left empty until real URLs are supplied.
   */
  social: [] as NavItem[],
} as const;

export type Site = typeof site;
