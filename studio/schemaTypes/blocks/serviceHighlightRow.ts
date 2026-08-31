import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The full-bleed three-column row under the hero.
 *
 * Exactly three tiles, because the row is a three-column grid at 768px and up.
 * A fourth would wrap into a second row of one, which is not a layout this
 * section has. Enforcing it here is kinder than letting an editor discover it.
 */
export const serviceHighlightRow = defineType({
  name: 'serviceHighlightRow',
  title: 'Highlight row',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Accessible section label',
      type: 'string',
      description:
        'Names the row for screen readers, since it has no visible heading. Not shown on screen.',
    }),
    defineField({
      name: 'tiles',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'highlightTile',
          fields: [
            defineField({
              name: 'title',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'body', type: 'text', rows: 3 }),
            defineField({
              name: 'href',
              title: 'Destination',
              type: 'string',
              description: 'Where "Read More" goes, e.g. /services/mortgage-solutions/.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'image',
              title: 'Background photograph',
              type: 'altImage',
              description: 'Sits behind the overlay, so it is decorative.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'overlay',
              type: 'string',
              description:
                'The dark overlay is the default. Teal is what makes the middle tile read blue. Both were checked for text contrast; there is no free colour choice here on purpose.',
              options: {
                list: [
                  { title: 'Dark', value: 'ink' },
                  { title: 'Teal', value: 'teal' },
                ],
                layout: 'radio',
              },
              initialValue: 'ink',
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'href', media: 'image' } },
        },
      ],
      validation: (Rule) =>
        Rule.length(3).error('This row is a three-column grid, so it needs exactly three tiles.'),
    }),
    hiddenField,
  ],
  preview: sectionPreview('Highlight row'),
});
