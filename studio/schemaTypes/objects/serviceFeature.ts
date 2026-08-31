import { defineType, defineField } from 'sanity';

export const serviceFeature = defineType({
  name: 'serviceFeature',
  title: 'Feature card',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'icon', type: 'altImage' }),
  ],
  preview: { select: { title: 'title', media: 'icon' } },
});
