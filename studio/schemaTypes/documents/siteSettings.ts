import { defineType, defineField } from 'sanity';

/**
 * Singleton. Covers everything that used to live in `src/data/site.ts`.
 *
 * Two things stay in code and are deliberately absent here:
 * `SITE_URL` and `IS_PRODUCTION_HOST` gate indexing, and a content edit must
 * not be able to deindex the site.
 *
 * The phone number is stored once, in E.164, and validated. The WordPress site
 * printed three different numbers, one missing a digit (audit defect #4), so
 * the `tel:` href is always derived from this single field. The display form is
 * a separate optional field only because its grouping is a presentation choice
 * that cannot be derived reliably; leave it empty and the E.164 value is shown.
 */

const linkFields = [
  defineField({ name: 'label', type: 'string', validation: (Rule) => Rule.required() }),
  defineField({
    name: 'href',
    type: 'string',
    description: 'A site path such as /about/, or a full URL.',
    validation: (Rule) => Rule.required(),
  }),
];

const linkPreview = { select: { title: 'label', subtitle: 'href' } };

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'contact', title: 'Contact' },
    { name: 'nav', title: 'Navigation' },
    { name: 'cta', title: 'Calls to action' },
    { name: 'legal', title: 'Legal & credits' },
  ],
  fields: [
    // ---- identity ----
    defineField({
      name: 'name',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'legalName',
      type: 'string',
      group: 'identity',
      description: 'Used in structured data. Often the same as the name.',
    }),
    defineField({
      name: 'tagline',
      type: 'string',
      group: 'identity',
      description: 'Appears in the top bar and after the site name in page titles.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 3,
      group: 'identity',
      description: 'One-paragraph description of the business, used in structured data.',
      validation: (Rule) => Rule.required(),
    }),

    // ---- contact ----
    defineField({
      name: 'phoneE164',
      title: 'Phone number',
      type: 'string',
      group: 'contact',
      description:
        'International format, no spaces, e.g. +971561924606. Every tel: link is built from this.',
      validation: (Rule) =>
        Rule.required()
          .regex(/^\+[1-9]\d{6,14}$/, { name: 'E.164' })
          .error('Use international format with no spaces, e.g. +971561924606'),
    }),
    defineField({
      name: 'phoneDisplay',
      title: 'Phone number, as displayed',
      type: 'string',
      group: 'contact',
      description: 'Optional grouping for readability, e.g. +971 56 192 4606.',
    }),
    defineField({
      name: 'email',
      type: 'string',
      group: 'contact',
      validation: (Rule) => Rule.required().email(),
    }),
    defineField({
      name: 'whatsappNumber',
      title: 'WhatsApp number',
      type: 'string',
      group: 'contact',
      description: 'Digits only, no plus, e.g. 971561924606. Leave empty to hide the button.',
      validation: (Rule) => Rule.regex(/^\d{7,15}$/, { name: 'digits only' }).warning(),
    }),
    defineField({
      name: 'addressLines',
      title: 'Address lines',
      type: 'array',
      of: [{ type: 'string' }],
      group: 'contact',
      description: 'One line per entry. Joined with commas where a single line is needed.',
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'mapsUrl',
      title: 'Google Maps link',
      type: 'url',
      group: 'contact',
      description: 'Opens when the address is clicked.',
    }),
    defineField({
      name: 'mapsEmbedQuery',
      title: 'Google Maps search text',
      type: 'string',
      group: 'contact',
      description: 'Used for the embedded map on the contact page.',
    }),

    // ---- navigation ----
    defineField({
      name: 'nav',
      title: 'Primary navigation',
      type: 'array',
      group: 'nav',
      of: [
        {
          type: 'object',
          name: 'navItem',
          fields: [
            ...linkFields,
            defineField({
              name: 'hasChildren',
              title: 'Show services submenu',
              type: 'boolean',
              description:
                'Only meaningful on the Services item. The children come from the services themselves.',
              initialValue: false,
            }),
          ],
          preview: linkPreview,
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'footerLinks',
      title: 'Footer quick links',
      type: 'array',
      group: 'nav',
      of: [{ type: 'object', name: 'footerLink', fields: linkFields, preview: linkPreview }],
    }),
    defineField({
      name: 'legalLinks',
      title: 'Bottom bar links',
      type: 'array',
      group: 'nav',
      of: [{ type: 'object', name: 'legalLink', fields: linkFields, preview: linkPreview }],
    }),
    defineField({
      name: 'social',
      title: 'Social profiles',
      type: 'array',
      group: 'nav',
      description:
        'Left empty deliberately: the original markup pointed at bare x.com and youtube.com placeholders rather than real profiles (audit defect #20).',
      of: [{ type: 'object', name: 'socialLink', fields: linkFields, preview: linkPreview }],
    }),

    // ---- calls to action ----
    defineField({
      name: 'ctaPrimary',
      title: 'Primary CTA',
      type: 'object',
      group: 'cta',
      fields: linkFields,
      description: 'The main button, used in the hero and the footer.',
    }),
    defineField({
      name: 'ctaHeader',
      title: 'Header CTA',
      type: 'object',
      group: 'cta',
      fields: linkFields,
    }),

    // ---- legal ----
    defineField({
      name: 'disclaimerFooter',
      title: 'Footer disclaimer',
      type: 'text',
      rows: 2,
      group: 'legal',
      description: 'The centred line above the copyright bar.',
    }),
    defineField({
      name: 'disclaimerCalculator',
      title: 'Calculator disclaimer',
      type: 'text',
      rows: 2,
      group: 'legal',
      description: 'Shown under the EMI calculator.',
    }),
    defineField({
      name: 'creditText',
      title: 'Credit line',
      type: 'string',
      group: 'legal',
      description: 'The current year is appended automatically, so do not include one.',
    }),
    defineField({ name: 'creditHref', title: 'Credit link', type: 'url', group: 'legal' }),
  ],
  preview: { prepare: () => ({ title: 'Site Settings' }) },
});
