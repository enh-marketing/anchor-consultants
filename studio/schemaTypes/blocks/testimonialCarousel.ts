import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The testimonial carousel.
 *
 * Quotes come from the `testimonial` documents, ordered by their own `order`
 * field, so the same set can be reused on the testimonials page without being
 * entered twice.
 */
export const testimonialCarousel = defineType({
  name: 'testimonialCarousel',
  title: 'Testimonial carousel',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string' }),
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    hiddenField,
  ],
  preview: sectionPreview('Testimonial carousel', 'title'),
});
