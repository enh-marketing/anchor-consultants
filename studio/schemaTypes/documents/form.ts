import { defineType, defineField } from 'sanity';

/**
 * A form.
 *
 * The same document drives the rendered form and the server-side validation in
 * `src/pages/api/contact.ts`, which is the point: making a field required here
 * makes it required in the browser and enforced on submission. A CMS where those
 * two can drift has validation that only looks enforced.
 *
 * Two things deliberately stay out of this document:
 *
 * **Credentials.** SMTP host, user and password, and the reCAPTCHA secret, are
 * environment variables. They are never content, and this document is readable
 * by anyone with the dataset.
 *
 * **The final say on the recipient.** `recipientEmail` is a preference. A
 * `CONTACT_TO` environment variable overrides it, so a content edit cannot
 * redirect enquiries somewhere they were never meant to go.
 *
 * `formId` must match a form the site renders. There is no way to invent a new
 * form here and have it appear on a page: a form needs a route to put it on, so
 * an unrecognised id is ignored with a build warning rather than half-working.
 */
export const form = defineType({
  name: 'form',
  title: 'Forms',
  type: 'document',
  groups: [
    { name: 'fields', title: 'Fields', default: true },
    { name: 'messages', title: 'Messages' },
    { name: 'delivery', title: 'Delivery' },
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Internal name',
      type: 'string',
      group: 'fields',
      description: 'Only shown in this list. Never appears on the site.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'formId',
      title: 'Which form is this?',
      type: 'string',
      group: 'fields',
      description:
        'Identifies the form the site already renders. Changing it points this document at a different form.',
      options: {
        list: [
          { title: 'Enquiry form (contact page and pop-up)', value: 'contact' },
          { title: 'CV upload form', value: 'cv' },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'fields',
      title: 'Fields',
      type: 'array',
      group: 'fields',
      description:
        'Drag to reorder. A field marked required is required in the browser and rejected by the server if empty.',
      of: [
        {
          type: 'object',
          name: 'formField',
          fields: [
            defineField({
              name: 'label',
              type: 'string',
              description:
                'Read by screen readers, and shown above the field on the CV form. Also used in the notification email.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'name',
              title: 'Field name',
              type: 'string',
              description:
                'The name this field is submitted under. Lower case, no spaces. Changing it on an existing field changes what the notification email calls it.',
              validation: (Rule) =>
                Rule.required().regex(/^[a-z][a-z0-9_]*$/, {
                  name: 'lower case, no spaces',
                }),
            }),
            defineField({
              name: 'type',
              type: 'string',
              options: {
                list: [
                  { title: 'Single line of text', value: 'text' },
                  { title: 'Email address', value: 'email' },
                  { title: 'Phone number', value: 'tel' },
                  { title: 'Paragraph', value: 'textarea' },
                  { title: 'Choose from a list', value: 'select' },
                  { title: 'Tick box', value: 'checkbox' },
                  { title: 'File upload', value: 'file' },
                ],
              },
              description:
                'Email and phone are checked for format, not just presence. File uploads accept PDF or Word up to 5 MB.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'required',
              type: 'boolean',
              initialValue: false,
            }),
            defineField({
              name: 'placeholder',
              type: 'string',
              description:
                'Grey text inside the field. On the enquiry form this is what the visitor sees, since the labels are there for screen readers.',
            }),
            defineField({
              name: 'helpText',
              title: 'Help text',
              type: 'string',
              description: 'Always visible, under the field.',
            }),
            defineField({
              name: 'requiredMessage',
              title: 'Message when left empty',
              type: 'string',
              description: 'Optional. A sensible default is used otherwise.',
            }),
            defineField({
              name: 'invalidMessage',
              title: 'Message when the format is wrong',
              type: 'string',
              description: 'Optional. Applies to email, phone, list and file fields.',
            }),
            defineField({
              name: 'options',
              title: 'Choices',
              type: 'array',
              description:
                'For "choose from a list" only. A list field with no choices is skipped.',
              hidden: ({ parent }) => parent?.type !== 'select',
              of: [
                {
                  type: 'object',
                  name: 'fieldOption',
                  fields: [
                    defineField({
                      name: 'label',
                      type: 'string',
                      validation: (Rule) => Rule.required(),
                    }),
                    defineField({
                      name: 'value',
                      type: 'string',
                      validation: (Rule) => Rule.required(),
                    }),
                  ],
                  preview: { select: { title: 'label', subtitle: 'value' } },
                },
              ],
            }),
            defineField({
              name: 'width',
              type: 'string',
              description:
                'Half-width fields pair up side by side on the enquiry form. Not a size: these are the only two widths the design has.',
              options: {
                list: [
                  { title: 'Full width', value: 'full' },
                  { title: 'Half width', value: 'half' },
                ],
                layout: 'radio',
              },
              initialValue: 'full',
            }),
            defineField({
              name: 'icon',
              type: 'string',
              description: 'The small mark inside the field on the enquiry form.',
              options: {
                list: [
                  { title: 'Person', value: 'user' },
                  { title: 'Envelope', value: 'envelope' },
                  { title: 'Telephone', value: 'phone' },
                  { title: 'Pencil', value: 'pencil' },
                ],
              },
            }),
            defineField({
              name: 'maxLength',
              title: 'Maximum characters',
              type: 'number',
              validation: (Rule) => Rule.min(1).max(20000),
            }),
            defineField({
              name: 'autocomplete',
              title: 'Autofill hint',
              type: 'string',
              description:
                'Lets a browser fill this in, e.g. name, email, tel. Leave empty if unsure.',
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'type', required: 'required' },
            prepare(value: Record<string, unknown>) {
              const type = typeof value['subtitle'] === 'string' ? value['subtitle'] : '';
              return {
                title: typeof value['title'] === 'string' ? value['title'] : 'Field',
                subtitle: value['required'] ? `${type} · required` : type,
              };
            },
          },
        },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),

    // ---- messages ----
    defineField({ name: 'submitLabel', title: 'Button text', type: 'string', group: 'messages' }),
    defineField({
      name: 'successMessage',
      type: 'text',
      rows: 2,
      group: 'messages',
      description: 'Shown after a successful send.',
    }),
    defineField({
      name: 'errorMessage',
      type: 'text',
      rows: 2,
      group: 'messages',
      description: 'Shown when the send fails.',
    }),
    defineField({
      name: 'validationMessage',
      title: 'Message when fields need attention',
      type: 'string',
      group: 'messages',
    }),

    // ---- delivery ----
    defineField({
      name: 'recipientEmail',
      title: 'Send submissions to',
      type: 'string',
      group: 'delivery',
      description:
        'Leave empty to use the site email address. A CONTACT_TO environment variable overrides this, so hosting keeps the final say on where enquiries go.',
      validation: (Rule) => Rule.email(),
    }),
    defineField({
      name: 'subjectPrefix',
      title: 'Email subject',
      type: 'string',
      group: 'delivery',
      description: 'The submitter’s name is appended, e.g. "Website enquiry — Jane Doe".',
    }),
    defineField({
      name: 'requireCaptcha',
      title: 'Spam protection',
      type: 'boolean',
      group: 'delivery',
      description:
        'On by default. Turning it off means this form accepts submissions without the spam check, which usually means more junk. The reCAPTCHA keys themselves are deployment settings, not content: a site key and its secret must match, and keeping them together is what stops them drifting apart.',
      initialValue: true,
    }),
    defineField({
      name: 'sendConfirmation',
      title: 'Also email the person who submitted',
      type: 'boolean',
      group: 'delivery',
      initialValue: false,
    }),
    defineField({
      name: 'confirmationSubject',
      type: 'string',
      group: 'delivery',
      hidden: ({ parent }) => !parent?.sendConfirmation,
    }),
    defineField({
      name: 'confirmationBody',
      title: 'Confirmation message',
      type: 'text',
      rows: 6,
      group: 'delivery',
      hidden: ({ parent }) => !parent?.sendConfirmation,
      description:
        'Sent as plain text. Deliberately not rich text: an editable message rendered as HTML into an email is an injection risk, and plain text reads perfectly well.',
    }),
  ],
  preview: { select: { title: 'name', subtitle: 'formId' } },
});
