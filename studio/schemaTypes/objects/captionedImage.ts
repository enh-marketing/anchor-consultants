import { defineType, defineField } from 'sanity';

/**
 * An image inside body copy, with an optional caption.
 *
 * Separate from `altImage` because a caption only makes sense here. Adding the
 * field to `altImage` would have put a caption box on hero backdrops and tile
 * backgrounds, where it would render nowhere — and a field that cannot do
 * anything is exactly the CMS noise the brief warns against.
 *
 * Alt text and caption are different things and both are worth having: the alt
 * describes the image for someone who cannot see it, the caption is editorial
 * copy everyone reads.
 */
export const captionedImage = defineType({
  name: 'captionedImage',
  title: 'Image',
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description:
        'Describe what the image shows, for screen readers and when it fails to load. Leave empty only if it is purely decorative.',
    }),
    defineField({
      name: 'caption',
      type: 'string',
      description: 'Printed under the image. Optional, and not a substitute for alt text.',
    }),
  ],
  preview: { select: { imageUrl: 'asset.url', title: 'caption', subtitle: 'alt' } },
});
