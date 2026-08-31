import { defineType, defineField } from 'sanity';

/**
 * A form submission.
 *
 * Stored in the same dataset as the content, which the client chose knowing the
 * trade-off: anyone who can open the Studio can read every enquiry. Three things
 * reduce that exposure without changing the decision.
 *
 * **Every field is read-only.** An enquiry is a record of what someone sent. It
 * is evidence, not content, and nobody should be able to quietly edit it.
 *
 * **No IP address is kept.** Rate limiting needs to recognise a repeat
 * submitter, not identify them, so only a salted hash is stored. Without the
 * salt — which lives in the environment — the hash cannot be reversed to an
 * address.
 *
 * **Nothing here is ever queried by the site.** Submissions are written by the
 * form endpoint and read only in the Studio. No page, loader or content
 * collection touches this type, so it cannot leak into a build.
 *
 * If access needs restricting properly, Sanity's role-based access can hide this
 * type from ordinary editors without any change here.
 */
export const submission = defineType({
  name: 'submission',
  title: 'Form submissions',
  type: 'document',
  // No create button: submissions come from the form endpoint, never by hand.
  readOnly: true,
  fields: [
    defineField({ name: 'formName', title: 'Form', type: 'string', readOnly: true }),
    defineField({ name: 'formId', type: 'string', readOnly: true, hidden: true }),
    defineField({ name: 'submittedAt', title: 'Received', type: 'datetime', readOnly: true }),
    defineField({
      name: 'summary',
      title: 'Summary',
      type: 'string',
      readOnly: true,
      description: 'Name and email, for scanning the list.',
    }),
    defineField({
      name: 'entries',
      title: 'What was submitted',
      type: 'array',
      readOnly: true,
      of: [
        {
          type: 'object',
          name: 'submissionEntry',
          readOnly: true,
          fields: [
            defineField({ name: 'label', type: 'string', readOnly: true }),
            defineField({ name: 'value', type: 'text', rows: 4, readOnly: true }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        },
      ],
    }),
    defineField({
      name: 'attachments',
      title: 'Attachments',
      type: 'array',
      readOnly: true,
      description: 'Filenames only. The file itself is emailed, not stored here.',
      of: [{ type: 'string' }],
    }),
    defineField({
      name: 'consent',
      title: 'Consent given',
      type: 'boolean',
      readOnly: true,
      description: 'Recorded when the form has a consent tick box. Blank when it has none.',
    }),
    defineField({
      name: 'sourcePage',
      title: 'Submitted from',
      type: 'string',
      readOnly: true,
    }),
    defineField({
      name: 'delivered',
      title: 'Email delivered',
      type: 'boolean',
      readOnly: true,
      description:
        'False means the enquiry was received and stored but the notification email did not send. Those need following up by hand.',
    }),
    defineField({
      name: 'submitterHash',
      title: 'Submitter fingerprint',
      type: 'string',
      readOnly: true,
      hidden: true,
      description:
        'A salted hash used for rate limiting. Not an IP address, and not reversible without the salt.',
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'newest',
      by: [{ field: 'submittedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'summary', form: 'formName', at: 'submittedAt', delivered: 'delivered' },
    prepare(value: Record<string, unknown>) {
      const at = typeof value['at'] === 'string' ? value['at'].slice(0, 16).replace('T', ' ') : '';
      const form = typeof value['form'] === 'string' ? value['form'] : 'Form';
      return {
        title: typeof value['title'] === 'string' ? value['title'] : 'Submission',
        subtitle: `${form} · ${at}` + (value['delivered'] === false ? ' · EMAIL NOT SENT' : ''),
      };
    },
  },
});
