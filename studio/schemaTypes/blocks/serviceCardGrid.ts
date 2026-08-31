import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The grid of service cards.
 *
 * The cards are the `service` documents, ordered by their own `order` field, so
 * adding a service adds a card. Only the link text is editable: retyping
 * service names here would let this grid and the service pages disagree.
 */
export const serviceCardGrid = defineType({
  name: 'serviceCardGrid',
  title: 'Service cards',
  type: 'object',
  fields: [
    defineField({
      name: 'cardLinkLabel',
      title: 'Card link text',
      type: 'string',
      description: 'Shown under each card title, e.g. "Read More".',
    }),
    hiddenField,
  ],
  preview: sectionPreview('Service cards'),
});
