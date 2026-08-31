import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * Overlapping image pair beside a block of copy.
 *
 * Exactly two images: the second is offset from the first by a measured
 * percentage, so the composition is a pair rather than a gallery.
 */
export const aboutSplit = defineType({
  name: 'aboutSplit',
  title: 'About split',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      type: 'blockContent',
      description:
        'Rich text. Bold is used for the lead-in lines and for emphasis inside the paragraph.',
    }),
    defineField({ name: 'cta', title: 'Button', type: 'sectionLink' }),
    defineField({
      name: 'images',
      title: 'Image pair',
      type: 'array',
      of: [{ type: 'altImage' }],
      description:
        'Two images. The second overlaps the first, down and to the right. Leave empty to keep the pair that ships with the theme.',
      validation: (Rule) =>
        Rule.length(2).error('This section overlaps two images, so it needs exactly two.'),
    }),
    hiddenField,
  ],
  preview: sectionPreview('About split', 'title'),
});
