import { defineType, defineField } from 'sanity';
import { isUniqueSlug } from '../uniqueSlug';

/**
 * A blog category.
 *
 * Each one gets its own archive at `/blog/category/<slug>/`, which is why it
 * carries a slug, a description and its own SEO rather than being a string on
 * the post. The WordPress site's category links pointed at taxonomy routes a
 * static build does not have; these are real pages.
 *
 * The description is used on the archive page, so an empty one leaves the
 * archive with only a heading rather than breaking it.
 */
export const category = defineType({
  name: 'category',
  title: 'Categories',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96, isUnique: isUniqueSlug },
      description: 'Sets the archive URL: /blog/category/<slug>/.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      description: 'Shown at the top of the category archive. Optional.',
    }),
    defineField({ name: 'seo', type: 'seo' }),
  ],
  preview: { select: { title: 'title', subtitle: 'slug.current' } },
});
