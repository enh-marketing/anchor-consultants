import { defineType, defineField } from 'sanity';
import { isUniqueSlug } from '../uniqueSlug';
import { isSafeSlug } from '../../../src/lib/slug';

/**
 * A blog tag.
 *
 * Deliberately thinner than a category: no description, no SEO, and no archive
 * route. Tags label a post; categories organise the blog. Giving both the same
 * weight is how a site ends up with two parallel taxonomies that nobody
 * maintains, and with thin archive pages that dilute the ones that matter.
 *
 * Tags are shown on a post and drive "related posts" suggestions.
 */
export const tag = defineType({
  name: 'tag',
  title: 'Tags',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96, isUnique: isUniqueSlug },
      validation: (Rule) => Rule.required().custom((value) => isSafeSlug(value?.current)),
    }),
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
});
