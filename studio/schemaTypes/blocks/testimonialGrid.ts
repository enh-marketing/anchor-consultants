import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * Every testimonial, as a three-column grid.
 *
 * The quotes are the `testimonial` documents, so the same set feeds the home
 * page carousel without being entered twice.
 */
export const testimonialGrid = defineType({
  name: 'testimonialGrid',
  title: 'Testimonial grid',
  type: 'object',
  fields: [
    defineField({
      name: 'srHeading',
      title: 'Screen-reader heading',
      type: 'string',
      description:
        'Not shown on screen, but read aloud. The section needs a name because the page heading is up in the banner.',
    }),
    hiddenField,
  ],
  preview: sectionPreview('Testimonial grid'),
});
