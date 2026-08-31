import type { CmsImageValue } from './sanity/image';

/**
 * Section block types for the page builder.
 *
 * These mirror the object types in `studio/schemaTypes/blocks/`. Each one maps
 * to exactly one component in `src/components/sections/`, which in turn renders
 * the section component that already existed and was measured against the
 * original site. The CMS changes where content comes from; it never changes the
 * markup, which is what keeps the design fixed while the content becomes
 * editable.
 *
 * **Every content field is optional on purpose.** A component falls back to the
 * value it shipped with when a field is absent, so three things all work: a
 * page with no Sanity document at all, a half-filled document mid-edit, and a
 * document written against an older schema. A missing field must never blank
 * out a section — that was the failure mode of the WordPress build's scroll
 * reveals, and the same principle applies here.
 *
 * Presentation is deliberately not modelled. There is no colour, font size or
 * margin field anywhere below. Where a section genuinely varies, it varies by a
 * named variant (`overlay: 'ink' | 'teal'`) that the component translates into
 * its own classes.
 */

/** A label and a destination. Both are required, or the link is dropped. */
export interface SectionLink {
  label?: string;
  href?: string;
}

/** An image from the CMS or from `src/assets`, plus alt text for the local case. */
export interface SectionImage {
  image?: CmsImageValue;
  alt?: string;
}

/**
 * Shared by every block. `hidden` is the section visibility toggle from spec
 * §2; it is checked by `SectionRenderer`, not by the components, so a section
 * cannot forget to honour it.
 */
export interface SectionBase {
  _type: string;
  _key?: string;
  hidden?: boolean;
}

export interface HeroCarouselBlock extends SectionBase {
  _type: 'heroCarousel';
  /** Section backdrop. Falls back to the theme asset in `src/assets`. */
  backdrop?: CmsImageValue;
  slides?: Array<{
    eyebrow?: string;
    title?: string;
    body?: string;
    image?: CmsImageValue;
    alt?: string;
  }>;
  cta?: SectionLink;
}

export interface ServiceHighlightRowBlock extends SectionBase {
  _type: 'serviceHighlightRow';
  label?: string;
  tiles?: Array<{
    title?: string;
    body?: string;
    href?: string;
    image?: CmsImageValue;
    /** Which overlay the tile uses. The middle tile reads blue because of this. */
    overlay?: 'ink' | 'teal';
  }>;
}

export interface AboutSplitBlock extends SectionBase {
  _type: 'aboutSplit';
  eyebrow?: string;
  title?: string;
  /** Portable Text, so the emphasis inside the copy is content rather than markup. */
  body?: unknown;
  cta?: SectionLink;
  images?: SectionImage[];
}

export interface ServicesCarouselBlock extends SectionBase {
  _type: 'servicesCarousel';
  /** Section background, behind the #436B88 overlay. */
  background?: CmsImageValue;
  eyebrow?: string;
  title?: string;
  trackLabel?: string;
  cardCtaLabel?: string;
  cardCtaHref?: string;
}

export interface EmiCalculatorBlock extends SectionBase {
  _type: 'emiCalculator';
  title?: string;
}

export interface LeaderProfileBlock extends SectionBase {
  _type: 'leaderProfile';
  /** Section background, behind the overlay. */
  background?: CmsImageValue;
  title?: string;
  ctaHeading?: string;
  /** Each opens a dialog rather than navigating, so the target is a dialog id. */
  actions?: Array<{ label?: string; dialog?: string }>;
}

export interface FaqAccordionBlock extends SectionBase {
  _type: 'faqAccordion';
  eyebrow?: string;
  title?: string;
  footerText?: string;
  footerLink?: SectionLink;
}

export interface TestimonialCarouselBlock extends SectionBase {
  _type: 'testimonialCarousel';
  eyebrow?: string;
  title?: string;
}

// ---------------------------------------------------------------------------
// Inner-page blocks (milestone 17)
//
// Each of these is named for the layout it renders rather than for something
// generic, because the layouts were measured individually: the About intro's
// image pair is absolutely positioned at specific offsets, and the skills panel
// carries progress bars. A single "image and text" block with enough options to
// cover all of them would be a spacing system in disguise, which is what spec
// §4 rules out.
// ---------------------------------------------------------------------------

export interface PageBannerBlock extends SectionBase {
  _type: 'pageBanner';
  title?: string;
  /** Trail after Home. The last entry is the current page. */
  crumb?: string;
  image?: CmsImageValue;
}

export interface AboutIntroBlock extends SectionBase {
  _type: 'aboutIntro';
  eyebrow?: string;
  title?: string;
  body?: unknown;
  /** Main image then inset. The inset overlaps the main one. */
  images?: SectionImage[];
}

export interface CopyWithImageBlock extends SectionBase {
  _type: 'copyWithImage';
  title?: string;
  /** The bullet-style lines. Rendered with no gap between paragraphs. */
  body?: unknown;
  /** The closing paragraphs. Rendered one blank line apart. */
  closing?: unknown;
  image?: CmsImageValue;
  imageAlt?: string;
}

export interface SkillsPanelBlock extends SectionBase {
  _type: 'skillsPanel';
  eyebrow?: string;
  title?: string;
  body?: string;
  skills?: Array<{ label?: string; value?: number }>;
  image?: CmsImageValue;
  imageAlt?: string;
}

export interface ServiceCardGridBlock extends SectionBase {
  _type: 'serviceCardGrid';
  /** The cards come from the service documents; this is the link text on each. */
  cardLinkLabel?: string;
}

export interface TestimonialGridBlock extends SectionBase {
  _type: 'testimonialGrid';
  /** Visually hidden, but it is the section's accessible heading. */
  srHeading?: string;
}

export interface BlogIndexBlock extends SectionBase {
  _type: 'blogIndex';
  emptyHeading?: string;
  emptyBody?: string;
  emptyCta?: SectionLink;
}

export interface RichTextBlock extends SectionBase {
  _type: 'richTextSection';
  /** Optional callout above the prose, inside the same measure. */
  notice?: { title?: string; body?: string };
  body?: unknown;
}

export interface NoticeBlock extends SectionBase {
  _type: 'notice';
  title?: string;
  body?: string;
}

export interface ErrorPanelBlock extends SectionBase {
  _type: 'errorPanel';
  /** Decorative, rendered as an aria-hidden paragraph rather than a heading. */
  code?: string;
  heading?: string;
  body?: unknown;
  cta?: SectionLink;
}

export type SectionBlock =
  | HeroCarouselBlock
  | ServiceHighlightRowBlock
  | AboutSplitBlock
  | ServicesCarouselBlock
  | EmiCalculatorBlock
  | LeaderProfileBlock
  | FaqAccordionBlock
  | TestimonialCarouselBlock
  | PageBannerBlock
  | AboutIntroBlock
  | CopyWithImageBlock
  | SkillsPanelBlock
  | ServiceCardGridBlock
  | TestimonialGridBlock
  | BlogIndexBlock
  | RichTextBlock
  | NoticeBlock
  | ErrorPanelBlock;

/**
 * Drops a link that is missing either half.
 *
 * A half-typed row in the Studio would otherwise render an anchor with no text
 * or a label pointing nowhere. `getSite()` applies the same rule to navigation,
 * and it holds here for the same reason.
 */
export function resolveLink(
  link: SectionLink | undefined,
  fallback: { label: string; href: string },
): { label: string; href: string } {
  const label = link?.label?.trim();
  const href = link?.href?.trim();
  return label && href ? { label, href } : fallback;
}

/** `alt` as a spreadable prop, since `exactOptionalPropertyTypes` rejects `alt={undefined}`. */
export function altProp(alt: string | undefined): { alt: string } | Record<string, never> {
  return alt ? { alt } : {};
}
