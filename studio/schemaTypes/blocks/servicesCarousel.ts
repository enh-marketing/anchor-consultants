import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * Carousel of service cards over a photographic background.
 *
 * The cards themselves are not editable here: they come from the `service`
 * documents, ordered by their own `order` field. That is the point of spec §17.
 * Retyping service names into a section would let this row and the services
 * pages disagree with each other.
 */
export const servicesCarousel = defineType({
  name: 'servicesCarousel',
  title: 'Services carousel',
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
      name: 'trackLabel',
      title: 'Accessible carousel label',
      type: 'string',
      description: 'Names the list of cards for screen readers. Not shown on screen.',
    }),
    defineField({
      name: 'cardCtaLabel',
      title: 'Card button text',
      type: 'string',
      description: 'The bar across the bottom of a card on hover.',
    }),
    defineField({
      name: 'cardCtaHref',
      title: 'Card button destination',
      type: 'string',
      description: 'Where the card bar points, e.g. /services/.',
    }),
    defineField({
      name: 'background',
      type: 'altImage',
      description:
        'Photograph behind the blue overlay. Leave empty to keep the one that ships with the theme.',
    }),
    hiddenField,
  ],
  preview: sectionPreview('Services carousel', 'title'),
});
