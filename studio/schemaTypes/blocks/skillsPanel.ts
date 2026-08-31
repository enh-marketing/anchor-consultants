import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * Copy with proportion bars, beside an image.
 *
 * The eyebrow renders in the site's one red accent. That is not exposed as a
 * colour: it belongs to this section, and a colour field here would invite it
 * somewhere it does not belong.
 *
 * Percentages are held to 0-100. A bar above 100 renders outside its track, and
 * a progressbar whose value exceeds its maximum is invalid to a screen reader
 * as well as wrong on screen.
 */
export const skillsPanel = defineType({
  name: 'skillsPanel',
  title: 'Skills panel',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'body', type: 'text', rows: 4 }),
    defineField({
      name: 'skills',
      title: 'Bars',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'skill',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'value',
              title: 'Percentage',
              type: 'number',
              validation: (Rule) => Rule.required().min(0).max(100),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        },
      ],
      validation: (Rule) => Rule.max(4),
    }),
    defineField({ name: 'image', type: 'altImage' }),
    hiddenField,
  ],
  preview: sectionPreview('Skills panel', 'title'),
});
