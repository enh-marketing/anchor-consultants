import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The error page panel.
 *
 * The large number is decorative and renders as an aria-hidden paragraph, not a
 * heading: the page's accessible title is the banner h1. It is editable because
 * it is the page's dominant visual, and a 500 page would want a different one.
 *
 * The original's subhead read "We will get back to you as soon as possible.",
 * which belongs on a form confirmation rather than a missing page (defect #28).
 * That copy is now editable, which is how it should have been.
 */
export const errorPanel = defineType({
  name: 'errorPanel',
  title: 'Error panel',
  type: 'object',
  fields: [
    defineField({
      name: 'code',
      title: 'Large number',
      type: 'string',
      description: 'Decorative, and hidden from screen readers. Usually 404.',
    }),
    defineField({
      name: 'heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      type: 'blockContent',
      description: 'A short explanation. Links are useful here.',
    }),
    defineField({ name: 'cta', title: 'Button', type: 'sectionLink' }),
    hiddenField,
  ],
  preview: sectionPreview('Error panel', 'heading'),
});
