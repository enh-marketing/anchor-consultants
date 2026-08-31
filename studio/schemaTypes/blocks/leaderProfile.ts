import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The leader card and the appointment call to action beneath it.
 *
 * The person shown comes from the `teamMember` documents, first by `order`, so
 * the name, role, portrait and bio are edited once in one place.
 *
 * The two actions open dialogs rather than navigating, so the target is a
 * dialog id chosen from a fixed list. A free-text field here would let an
 * editor point a button at a dialog that does not exist, and the button would
 * silently do nothing.
 */
export const leaderProfile = defineType({
  name: 'leaderProfile',
  title: 'Leader profile',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'ctaHeading',
      title: 'Call to action line',
      type: 'text',
      rows: 2,
      description: 'The large centred line under the card.',
    }),
    defineField({
      name: 'actions',
      title: 'Dialog buttons',
      type: 'array',
      of: [
        {
          type: 'object',
          name: 'dialogAction',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'dialog',
              title: 'Opens',
              type: 'string',
              options: {
                list: [
                  { title: 'Enquiry form', value: 'contact-dialog' },
                  { title: 'CV upload form', value: 'cv-dialog' },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'dialog' } },
        },
      ],
      validation: (Rule) => Rule.max(2),
    }),
    defineField({
      name: 'background',
      type: 'altImage',
      description:
        'Photograph behind the overlay. Leave empty to keep the one that ships with the theme.',
    }),
    hiddenField,
  ],
  preview: sectionPreview('Leader profile', 'title'),
});
