import { defineType, defineField } from 'sanity';
import { isUniqueSlug } from '../uniqueSlug';

/**
 * A post author.
 *
 * A document rather than a string on each post, so a change of role or photo
 * happens once instead of on every article. The WordPress site had every post
 * attributed to a bare string, which is how a byline ends up spelled three
 * different ways.
 *
 * The slug exists so author archives can be added later without a migration.
 * Nothing routes to it yet, and it is not presented as if it does.
 */
export const author = defineType({
  name: 'author',
  title: 'Authors',
  type: 'document',
  fields: [
    defineField({ name: 'name', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96, isUnique: isUniqueSlug },
      description:
        'Not a URL yet. Reserved so author pages can be added without renaming anything.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'role',
      type: 'string',
      description: 'Shown under the name on a post, e.g. "Managing Director".',
    }),
    defineField({ name: 'photo', type: 'altImage' }),
    defineField({
      name: 'bio',
      type: 'text',
      rows: 4,
      description: 'A sentence or two, shown at the end of a post.',
    }),
    defineField({
      name: 'links',
      title: 'Profile links',
      type: 'array',
      of: [{ type: 'sectionLink' }],
      description: 'Optional. LinkedIn, a personal site, and so on.',
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'role', media: 'photo' } },
});
