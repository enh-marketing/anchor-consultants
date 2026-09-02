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
    { name: 'brand', title: 'Branding' },
    { name: 'contact', title: 'Contact' },
    { name: 'nav', title: 'Navigation' },
    { name: 'blog', title: 'Blog' },
    { name: 'footer', title: 'Footer' },
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

    // ---- branding ----
    //
    // Every image here is optional, and empty is the better default. The
    // committed assets are optimised at build time and the favicon is an SVG,
    // which is sharper at every size than a raster. Uploading replaces them
    // only when someone deliberately wants that.
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'altImage',
      group: 'brand',
      description: 'Shown in the header. Leave empty to keep the logo that ships with the site.',
    }),
    defineField({
      name: 'footerLogo',
      title: 'Footer logo',
      type: 'altImage',
      group: 'brand',
      description:
        'Only needed if the footer should use a different mark. Leave empty and the header logo is used.',
    }),
    defineField({
      name: 'favicon',
      title: 'Favicon',
      type: 'image',
      group: 'brand',
      description:
        'The browser tab icon. Upload a square image, 512x512 or larger. Leave empty to keep the built-in one, which is a vector and stays sharp at any size.',
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
    /**
     * The landline is optional where the mobile is required. One number is a
     * working site; the mobile is the one every `tel:` link and the top bar
     * depend on, so it cannot be emptied. Clearing the landline simply removes
     * the extra row from the footer and the contact page.
     */
    defineField({
      name: 'landlineE164',
      title: 'Landline number',
      type: 'string',
      group: 'contact',
      description:
        'Optional second number. International format, no spaces, e.g. +97145851238. ' +
        'A local form like 045851238 will not dial from outside the UAE.',
      // A custom rule rather than `regex`, so an empty value stays valid. This
      // field is meant to be clearable, and a regex rule would object to blank.
      validation: (Rule) =>
        Rule.custom((value) => {
          if (typeof value !== 'string' || !value.trim()) return true;
          return /^\+[1-9]\d{6,14}$/.test(value.trim())
            ? true
            : 'Use international format with no spaces, e.g. +97145851238';
        }),
    }),
    defineField({
      name: 'landlineDisplay',
      title: 'Landline number, as displayed',
      type: 'string',
      group: 'contact',
      description: 'Optional grouping for readability, e.g. +971 4 585 1238.',
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
    defineField({
      name: 'businessHours',
      title: 'Opening hours',
      type: 'string',
      group: 'contact',
      description:
        'For example "Sunday to Thursday, 9am to 6pm". Leave empty to show nothing: the site currently displays no hours, so filling this adds a row to the contact page.',
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
        'Empty by default, and nothing is shown while it is empty. The original markup pointed at bare x.com and youtube.com rather than real profiles (audit defect #20), so there was no working row to carry over. Adding one profile shows a row of icons in the footer.',
      of: [
        {
          type: 'object',
          name: 'socialProfile',
          fields: [
            defineField({
              name: 'platform',
              type: 'string',
              description: 'Chooses the icon and the label a screen reader reads.',
              options: {
                list: [
                  { title: 'Facebook', value: 'facebook' },
                  { title: 'Instagram', value: 'instagram' },
                  { title: 'LinkedIn', value: 'linkedin' },
                  { title: 'X', value: 'x' },
                  { title: 'YouTube', value: 'youtube' },
                  { title: 'TikTok', value: 'tiktok' },
                ],
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Profile URL',
              type: 'url',
              description: 'The full address of the profile, not the platform home page.',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'platform', subtitle: 'url' } },
        },
      ],
    }),

    // ---- blog ----
    //
    // Global rather than per-page: the sidebar renders on the blog index, on
    // every post and on every category archive, so a heading set in one place
    // would otherwise have to be repeated in three.
    defineField({
      name: 'blogRecentTitle',
      title: 'Recent posts heading',
      type: 'string',
      group: 'blog',
    }),
    defineField({
      name: 'blogArchivesTitle',
      title: 'Archives heading',
      type: 'string',
      group: 'blog',
    }),
    defineField({
      name: 'blogCategoriesTitle',
      title: 'Categories heading',
      type: 'string',
      group: 'blog',
    }),
    defineField({
      name: 'blogSearchPlaceholder',
      title: 'Search box placeholder',
      type: 'string',
      group: 'blog',
    }),
    defineField({
      name: 'blogSearchLabel',
      title: 'Search box label',
      type: 'string',
      group: 'blog',
      description: 'Not shown on screen. Read aloud by a screen reader.',
    }),
    defineField({
      name: 'blogFilterEmpty',
      title: 'No matches message',
      type: 'string',
      group: 'blog',
      description: 'Shown when a search or category filter finds nothing.',
    }),
    defineField({
      name: 'blogFilterReset',
      title: 'Clear filter link',
      type: 'string',
      group: 'blog',
    }),

    // ---- footer ----
    defineField({
      name: 'footerPitch',
      title: 'Footer intro',
      type: 'text',
      rows: 5,
      group: 'footer',
      description: 'The paragraph beside the footer logo. Leave a blank line between paragraphs.',
    }),
    defineField({
      name: 'footerLinksTitle',
      title: 'Links column heading',
      type: 'string',
      group: 'footer',
    }),
    defineField({
      name: 'footerContactTitle',
      title: 'Contact column heading',
      type: 'string',
      group: 'footer',
    }),
    defineField({
      name: 'footerButtons',
      title: 'Footer buttons',
      type: 'array',
      group: 'footer',
      description: 'The two white buttons under the contact details.',
      of: [
        {
          type: 'object',
          name: 'footerButton',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'action',
              title: 'What it does',
              type: 'string',
              description:
                'Call us always uses the phone number above, so it cannot fall out of step with it.',
              options: {
                list: [
                  { title: 'Open the enquiry form', value: 'dialog' },
                  { title: 'Call us', value: 'phone' },
                  { title: 'Go to a page', value: 'link' },
                ],
                layout: 'radio',
              },
              initialValue: 'dialog',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'dialog',
              title: 'Which form',
              type: 'string',
              hidden: ({ parent }) => parent?.action !== 'dialog',
              options: {
                list: [
                  { title: 'Enquiry form', value: 'contact-dialog' },
                  { title: 'CV upload form', value: 'cv-dialog' },
                ],
              },
              initialValue: 'contact-dialog',
            }),
            defineField({
              name: 'href',
              title: 'Destination',
              type: 'string',
              hidden: ({ parent }) => parent?.action !== 'link',
              description: 'A site path such as /contact/, or a full URL.',
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'action' } },
        },
      ],
      validation: (Rule) => Rule.max(3),
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
