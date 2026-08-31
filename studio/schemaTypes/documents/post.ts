import { defineType, defineField } from 'sanity';
import { isUniqueSlug } from '../uniqueSlug';
import { isSafeSlug } from '../../../src/lib/slug';

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
      validation: (Rule) => Rule.required().custom((value) => isSafeSlug(value?.current)),
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
      type: 'reference',
      to: [{ type: 'author' }],
      description: 'Change a role or photo once on the author, not on every post.',
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
      name: 'categories',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'category' }] }],
      description:
        'Each category has its own archive page. One is usually enough; a post in five categories is in none of them properly.',
      validation: (Rule) => Rule.required().min(1).max(3).unique(),
    }),
    defineField({
      name: 'tags',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'tag' }] }],
      description: 'Labels for the post. Also used to suggest related reading.',
      validation: (Rule) => Rule.max(8).unique(),
    }),
    defineField({
      name: 'relatedPosts',
      title: 'Related posts',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'post' }] }],
      description:
        'Up to three, shown at the end of the post. Leave empty and posts sharing a tag or category are suggested instead.',
      validation: (Rule) => Rule.max(3).unique(),
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
