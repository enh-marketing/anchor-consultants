import { createImageUrlBuilder } from '@sanity/image-url';
import type { ImageMetadata } from 'astro';
import { SANITY_DATASET, SANITY_PROJECT_ID } from './client';

/** An image field as the Sanity loaders project it. */
export interface SanityImageValue {
  src: string;
  assetId?: string | undefined;
  alt?: string | undefined;
  decorative?: boolean | undefined;
  width?: number | undefined;
  height?: number | undefined;
  lqip?: string | undefined;
}

/** Either source a collection image can come from. */
export type CmsImageValue = ImageMetadata | SanityImageValue;

/**
 * Local files arrive as Astro `ImageMetadata`, which always carries `format`.
 * Sanity values never do, which makes it the reliable discriminator.
 */
export function isSanityImage(value: CmsImageValue): value is SanityImageValue {
  return !('format' in value);
}

const builder = SANITY_PROJECT_ID
  ? createImageUrlBuilder({ projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET })
  : null;

/**
 * A CDN URL at a given width.
 *
 * `auto('format')` is what keeps the WebP/AVIF delivery the local pipeline gave
 * us: Sanity serves the best format the requesting browser accepts. Quality 80
 * matches Astro's default so the switch does not change file sizes.
 */
export function sanityImageUrl(value: SanityImageValue, width: number): string {
  if (!builder || !value.assetId) return value.src;
  return builder.image(value.assetId).width(width).quality(80).auto('format').fit('max').url();
}

/** `srcset` across the widths a component asks for. */
export function sanityImageSrcSet(value: SanityImageValue, widths: number[]): string {
  return widths.map((w) => `${sanityImageUrl(value, w)} ${w}w`).join(', ');
}

/**
 * Alt text for a Sanity image. An image marked decorative resolves to an empty
 * alt so it is skipped by screen readers, which is the same distinction the
 * local images already make.
 */
export function sanityImageAlt(value: SanityImageValue): string {
  return value.decorative ? '' : (value.alt ?? '');
}
