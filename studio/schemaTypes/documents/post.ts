import { defineType, defineField } from 'sanity';
import { isUniqueSlug } from '../uniqueSlug';

export const post = defineType({
  name: 'post',
  title: 'Blog post',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96, isUnique: isUniqueSlug },
      description: 'Sets the URL: /blog/<slug>/.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'updatedAt', title: 'Last updated', type: 'datetime' }),
    defineField({
      name: 'author',
      type: 'string',
      initialValue: 'Anchor Consultants',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'excerpt',
      type: 'text',
      rows: 3,
      description: 'Shown on the blog index. Written, not truncated from the body.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'coverImage', title: 'Cover image', type: 'altImage' }),
    defineField({
      name: 'category',
      type: 'string',
      description: 'Groups the post in the blog sidebar.',
      initialValue: 'Uncategorized',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'body', title: 'Body', type: 'blockContent' }),
    defineField({ name: 'seo', type: 'seo', validation: (Rule) => Rule.required() }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'publishedAt', media: 'coverImage' },
  },
});
