import { defineType, defineField } from 'sanity';
import { sectionPreview } from './_shared';

/**
 * The inner-page banner. Carries the page's `<h1>`.
 *
 * Title is required and there is no hide toggle: a page with no h1 is an
 * accessibility and SEO regression rather than a layout preference, and hiding
 * this section would produce exactly that.
 *
 * On the original this band renders as an empty grey strip (defects #2 and #3).
 * The title and breadcrumb were restored per the client's decision on Q1.
 */
export const pageBanner = defineType({
  name: 'pageBanner',
  title: 'Page banner',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      description: 'The main heading of the page. Shown large, over the photograph.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'crumb',
      title: 'Breadcrumb label',
      type: 'string',
      description: 'The current page in the trail after Home.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Background photograph',
      type: 'altImage',
      description: 'Sits behind a dark overlay, so it is decorative. 1520x266 works best.',
    }),
  ],
  preview: sectionPreview('Page banner', 'title'),
});
