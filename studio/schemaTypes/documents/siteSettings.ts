import { defineType, defineField } from 'sanity';

/**
 * Singleton. Everything here lives in src/data/site.ts today.
 *
 * Two things stay in code and are deliberately absent:
 *   SITE_URL and IS_PRODUCTION_HOST gate indexing, and a content edit must not
 *   be able to deindex the site.
 *
 * The phone number is one field, not three. The WordPress site printed three
 * different numbers, one missing a digit (audit defect #4); the display string
 * and the tel: href are both derived from this single value.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  groups: [
    { name: 'contact', title: 'Contact', default: true },
    { name: 'nav', title: 'Navigation' },
    { name: 'legal', title: 'Legal & credits' },
  ],
  fields: [
    defineField({
      name: 'phoneE164',
      title: 'Phone number',
      type: 'string',
      group: 'contact',
      description:
        'Digits only, international format, e.g. +971561924606. The displayed number and the tel: link are both built from this.',
      validation: (Rule) =>
        Rule.required()
          .regex(/^\+[1-9]\d{6,14}$/, { name: 'E.164' })
          .error('Use international format with no spaces, e.g. +971561924606'),
    }),
    defineField({
      name: 'email',
      type: 'string',
      group: 'contact',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'addressSingle',
      title: 'Address (one line)',
      type: 'string',
      group: 'contact',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'mapsQuery',
      title: 'Google Maps search text',
      type: 'string',
      group: 'contact',
      description: 'Used for the embedded map and the "open in Maps" link.',
    }),
    defineField({
      name: 'nav',
      title: 'Primary navigation',
      type: 'array',
      group: 'nav',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'href', type: 'string', validation: (R) => R.required() }),
            defineField({
              name: 'hasChildren',
              title: 'Show services submenu',
              type: 'boolean',
              description: 'Only meaningful on the Services item.',
              initialValue: false,
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        },
      ],
    }),
    defineField({
      name: 'footerLinks',
      title: 'Footer quick links',
      type: 'array',
      group: 'nav',
      of: [
        {
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string', validation: (R) => R.required() }),
            defineField({ name: 'href', type: 'string', validation: (R) => R.required() }),
          ],
          preview: { select: { title: 'label', subtitle: 'href' } },
        },
      ],
    }),
    defineField({
      name: 'footerDisclaimer',
      title: 'Footer disclaimer',
      type: 'text',
      rows: 2,
      group: 'legal',
      description: 'The centred line above the copyright bar.',
    }),
    defineField({
      name: 'footerPitch',
      title: 'Footer pitch',
      type: 'text',
      rows: 4,
      group: 'legal',
    }),
    defineField({
      name: 'creditText',
      title: 'Credit line',
      type: 'string',
      group: 'legal',
      description: 'The year is appended automatically.',
    }),
    defineField({ name: 'creditHref', title: 'Credit link', type: 'url', group: 'legal' }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
});
