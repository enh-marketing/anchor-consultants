import { defineType, defineField } from 'sanity';

/**
 * Mirrors the `services` collection in src/content.config.ts field for field,
 * which is what lets the site swap its loader without touching page code.
 *
 * There is no `draft` field: Sanity has its own draft/publish workflow, and a
 * second flag would only let the two disagree. The site fetches published
 * documents only.
 */
export const service = defineType({
  name: 'service',
  title: 'Service',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: (Rule) => Rule.required() }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      description: 'Sets the URL: /services/<slug>/. Changing it breaks existing links.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'shortTitle',
      type: 'string',
      description: 'Used on cards, the services carousel and the header dropdown.',
    }),
    defineField({
      name: 'summary',
      type: 'text',
      rows: 3,
      description: 'Card summary on /services/ and the homepage carousel.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({ name: 'icon', title: 'Card icon', type: 'altImage' }),
    defineField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'altImage',
      description: '1290x670. All four services shared one photo on WordPress (audit defect #23).',
    }),
    defineField({
      name: 'bannerImage',
      title: 'Page banner',
      type: 'altImage',
      description: '1520x266. Falls back to a generic banner when empty.',
    }),
    defineField({
      name: 'features',
      title: 'Feature cards',
      type: 'array',
      of: [{ type: 'serviceFeature' }],
      description: 'Three on most services, none on Lease Rental Discounting. Optional.',
      validation: (Rule) => Rule.max(3),
    }),
    defineField({
      name: 'checklist',
      title: 'Checklist',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'Blue-tick bullet list. Optional.',
    }),
    defineField({
      name: 'order',
      type: 'number',
      description: 'Lower numbers come first, everywhere the services are listed.',
      initialValue: 99,
      validation: (Rule) => Rule.required().integer().positive(),
    }),
    defineField({ name: 'body', title: 'Body', type: 'blockContent' }),
    defineField({ name: 'seo', type: 'seo', validation: (Rule) => Rule.required() }),
  ],
  orderings: [
    { title: 'Display order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'summary', media: 'icon' },
  },
});
