import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * Overlapping image pair beside an introduction.
 *
 * Exactly two images, and the second is absolutely positioned against measured
 * offsets. This is a fixed composition rather than a gallery, which is why it
 * is its own block instead of a general image-and-text one.
 *
 * The body is plain text rather than rich text: it is one paragraph with no
 * inline formatting, and keeping it a string means the markup is identical
 * whichever source the copy comes from.
 */
export const aboutIntro = defineType({
  name: 'aboutIntro',
  title: 'Intro with image pair',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'body', type: 'text', rows: 5 }),
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
  preview: sectionPreview('Intro with image pair', 'title'),
});
