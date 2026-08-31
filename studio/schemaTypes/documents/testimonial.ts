import { defineType, defineField } from 'sanity';

export const testimonial = defineType({
  name: 'testimonial',
  title: 'Testimonial',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'location',
      type: 'string',
      description: 'Shown after the name, e.g. "Dubai".',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'quote', type: 'text', rows: 4, validation: (Rule) => Rule.required() }),
    defineField({
      name: 'order',
      type: 'number',
      initialValue: 99,
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({
      name: 'avatar',
      type: 'altImage',
      description: 'Optional. The source site has none.',
    }),
    defineField({
      name: 'rating',
      type: 'number',
      description: 'Optional, 1–5. Not shown on the current design.',
      validation: (Rule) => Rule.min(1).max(5),
    }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: { select: { title: 'name', subtitle: 'quote', media: 'avatar' } },
});
