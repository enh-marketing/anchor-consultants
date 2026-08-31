import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The FAQ accordion.
 *
 * The questions come from the `faq` documents, ordered by their own `order`
 * field. The same entries feed the FAQPage structured data on the home page, so
 * the markup and the schema cannot drift apart, which is why they are not
 * retyped into this section.
 */
export const faqAccordion = defineType({
  name: 'faqAccordion',
  title: 'FAQ accordion',
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
      name: 'footerText',
      title: 'Closing line',
      type: 'string',
      description: 'The line beside the question mark badge, before the link.',
    }),
    defineField({ name: 'footerLink', title: 'Closing link', type: 'sectionLink' }),
    hiddenField,
  ],
  preview: sectionPreview('FAQ accordion', 'title'),
});
