import { defineType, defineField } from 'sanity';

/**
 * The WordPress site let a plugin scrape descriptions from body text, which
 * produced things like "No testimonials found" (audit defect #22). Every page
 * on the rebuild carries a hand-written one, so this is required and length
 * validated rather than optional.
 */
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      description: 'Hand-written, 120–160 characters. Never copied from the body.',
      validation: (Rule) =>
        Rule.required()
          .min(120)
          .max(160)
          .error('Descriptions must be between 120 and 160 characters.'),
    }),
    defineField({
      name: 'metaTitle',
      title: 'Meta title',
      type: 'string',
      description: 'Only if it should differ from the page title.',
    }),
    defineField({
      name: 'ogImage',
      title: 'Social share image',
      type: 'image',
      description: 'Optional. Falls back to the site default.',
    }),
  ],
});
