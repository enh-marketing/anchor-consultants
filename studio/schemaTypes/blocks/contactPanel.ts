import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * Contact details beside an enquiry form.
 *
 * The details themselves — address, phone, email, opening hours — are not here.
 * They come from Site Settings, so this page cannot disagree with the header,
 * the footer and the structured data. Change them in one place.
 */
export const contactPanel = defineType({
  name: 'contactPanel',
  title: 'Contact details and form',
  type: 'object',
  fields: [
    defineField({ name: 'eyebrow', type: 'string', description: 'The small blue line above.' }),
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'formHeading',
      title: 'Form heading',
      type: 'string',
      description: 'Above the form, on the grey panel.',
    }),
    defineField({
      name: 'formId',
      title: 'Which form',
      type: 'string',
      description: 'Edit the form itself under Forms.',
      options: {
        list: [
          { title: 'Enquiry form', value: 'contact' },
          { title: 'CV upload form', value: 'cv' },
        ],
      },
      initialValue: 'contact',
    }),
    hiddenField,
  ],
  preview: sectionPreview('Contact details and form', 'title'),
});
