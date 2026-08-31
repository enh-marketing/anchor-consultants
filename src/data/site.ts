import type { CmsImageValue } from '../lib/sanity/image';

/**
 * Single source of truth for site-wide data.
 *
 * The WordPress build carried three different phone numbers, one of them
 * missing a digit, plus malformed `tel:` hrefs (audit defect #4). Defining
 * contact details once here makes that class of drift impossible.
 */

/**
 * The shape of the site-wide data, described explicitly rather than inferred
 * from the values below. It used to be `typeof site` with `as const`, which
 * pinned the type to today's literal strings — fine while this file was the
 * only source, wrong now that the values can come from Sanity.
 */
export interface Site {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  contact: {
    phone: { e164: string; href: string; display: string; compact: string };
    email: { address: string; href: string };
    whatsapp: { number: string; href: string };
    address: {
      lines: string[];
      single: string;
      mapsUrl: string;
      mapsEmbedQuery: string;
    };
    /**
     * Opening hours, as free text. Empty by default: the original site showed
     * none, so a value here adds a row to the contact page rather than filling
     * one that already exists.
     */
    hours: string;
  };
  nav: NavItem[];
  footerLinks: NavItem[];
  legalLinks: NavItem[];
  /**
   * Branding images. Each is optional: absent means the component keeps the
   * asset it imports from `src/assets`, which is build-optimised and therefore
   * the better default.
   */
  brand: {
    logo?: CmsImageValue;
    footerLogo?: CmsImageValue;
    favicon?: CmsImageValue;
  };
  /**
   * The blog sidebar's widget headings.
   *
   * Global rather than per-page: the sidebar renders on the blog index, on every
   * post and on every category archive, so a heading set in one place would have
   * to be repeated in three.
   */
  blog: {
    searchLabel: string;
    searchPlaceholder: string;
    recentTitle: string;
    archivesTitle: string;
    categoriesTitle: string;
    filterEmpty: string;
    filterReset: string;
  };
  /** The footer's first column and its two column headings. */
  footer: {
    pitch: string;
    linksTitle: string;
    contactTitle: string;
    buttons: FooterButton[];
  };
  cta: {
    primary: { label: string; href: string };
    header: { label: string; href: string };
  };
  disclaimers: { footer: string; calculator: string };
  credit: { text: string; href: string };
  social: SocialProfile[];
}

/**
 * A social profile.
 *
 * `platform` drives both the icon and the accessible name, so a profile cannot
 * be added without one. The original markup carried hidden links pointing at
 * bare `x.com` and `youtube.com` rather than real profiles (audit defect #20),
 * which is why this list ships empty.
 */
/**
 * A footer button.
 *
 * `action` says what the button does rather than encoding it in the href, so
 * "call us" cannot drift from the phone number in Site Settings: the `phone`
 * action always derives its href from the one canonical number.
 */
export interface FooterButton {
  label: string;
  action: 'dialog' | 'phone' | 'link';
  /** Dialog id, for `action: 'dialog'`. */
  dialog?: string;
  /** Destination, for `action: 'link'`. */
  href?: string;
}

export interface SocialProfile {
  platform: SocialPlatform;
  url: string;
}

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'x' | 'youtube' | 'tiktok';

export interface NavItem {
  label: string;
  href: string;
  /**
   * Marks an item as having a submenu. The children themselves are not listed
   * here: Header.astro fills them from the `services` collection so the
   * dropdown and the service pages can never fall out of step.
   */
  hasChildren?: boolean;
}

/** Digits only, E.164, for `tel:` hrefs. */
const PHONE_E164 = '+971561924606';

export const site: Site = {
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
      address: 'info@anchorconsultants.ae',
      href: 'mailto:info@anchorconsultants.ae',
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
    /** Empty on purpose. The original showed no opening hours. */
    hours: '',
  },

  /** Primary navigation. Flat, six items, no dropdowns — matches the original. */
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about/' },
    { label: 'Services', href: '/services/', hasChildren: true },
    { label: 'Testimonials', href: '/testimonials/' },
    { label: 'Blog', href: '/blog/' },
    { label: 'Contact', href: '/contact/' },
  ],

  /** Footer "Quick Links" mirrors the primary nav on the original site. */
  footerLinks: [
    { label: 'Home', href: '/' },
    { label: 'About Us', href: '/about/' },
    { label: 'Services', href: '/services/' },
    { label: 'Testimonials', href: '/testimonials/' },
    { label: 'Blog', href: '/blog/' },
    { label: 'Contact', href: '/contact/' },
  ],

  /** Bottom bar. Privacy Policy pointed at `#` on the original (defect #7). */
  legalLinks: [
    { label: 'FAQ', href: '/#faq' },
    { label: 'Privacy Policy', href: '/privacy-policy/' },
  ],

  /**
   * Branding images, all absent by default so each component keeps the
   * build-optimised asset it imports from `src/assets`.
   */
  brand: {},

  blog: {
    searchLabel: 'Search the blog',
    searchPlaceholder: 'Search',
    recentTitle: 'Recent Posts',
    archivesTitle: 'Archives',
    categoriesTitle: 'Categories',
    filterEmpty: 'No posts match that filter.',
    filterReset: 'Show all posts',
  },

  footer: {
    /**
     * The original is a single unstyled paragraph with a blank line between the
     * question and the body, not a bold heading followed by copy.
     */
    pitch:
      'Ready to Compare Options and Move Faster?\n\nTell us your property type, timeline, and borrower profile. We\u2019ll respond with a clear next step, required documents, and the most suitable lender pathways.',
    linksTitle: 'Quick Links',
    contactTitle: 'Contact Us',
    buttons: [
      { label: 'Free Consultation', action: 'dialog', dialog: 'contact-dialog' },
      { label: 'Call Now', action: 'phone' },
    ],
  },

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
    // The original hardcodes 2025 and has gone stale. The footer renders the
    // current year instead, so it cannot drift again.
  },

  /**
   * The original markup contains hidden social links pointing at bare
   * `http://x.com` and `http://youtube.com` — placeholders, not real
   * profiles (audit defect #20). Left empty until real URLs are supplied.
   */
  social: [],
};
