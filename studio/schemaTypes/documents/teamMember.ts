import { defineType, defineField } from 'sanity';

export const teamMember = defineType({
  name: 'teamMember',
  title: 'Team member',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({ name: 'role', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'bio',
      type: 'blockContent',
      description:
        'The leader bio on the homepage emphasises names, tenure and institutions in bold, so this is rich text rather than a plain textarea.',
    }),
    defineField({ name: 'photo', type: 'altImage' }),
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
  preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
});
