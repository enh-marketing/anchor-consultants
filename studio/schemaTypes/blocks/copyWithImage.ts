import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * Copy on the left, one image on the right.
 *
 * Two rich-text fields rather than one, because the original is two separate
 * paragraphs with different rhythms: the first holds bullet-style lines on
 * consecutive lines with no gap, the second holds sentences one blank line
 * apart. Portable Text cannot express "line break, no gap" versus "blank
 * line", so each original paragraph gets its own field and its own spacing.
 */
export const copyWithImage = defineType({
  name: 'copyWithImage',
  title: 'Copy with image',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Points',
      type: 'blockContent',
      description:
        'Each paragraph sits on the next line with no gap between them, which suits a short list of labelled points. Use bold for the labels.',
    }),
    defineField({
      name: 'closing',
      title: 'Closing copy',
      type: 'blockContent',
      description: 'Paragraphs here sit one blank line apart.',
    }),
    defineField({ name: 'image', type: 'altImage' }),
    hiddenField,
  ],
  preview: sectionPreview('Copy with image', 'title'),
});
