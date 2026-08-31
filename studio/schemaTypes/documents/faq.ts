import { defineType, defineField } from 'sanity';

/**
 * Rendered twice on the homepage: the accordion and the FAQPage structured
 * data, both from this one collection, so the two cannot drift apart.
 */
export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  fields: [
    defineField({ name: 'question', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'answer',
      type: 'text',
      rows: 4,
      description: 'Plain text. Also used verbatim in the FAQPage structured data.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'order',
      type: 'number',
      initialValue: 99,
      validation: (Rule) => Rule.required().integer().positive(),
    }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: { select: { title: 'question', subtitle: 'answer' } },
});
