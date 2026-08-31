import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * A page of prose, optionally opening with a callout.
 *
 * Headings, paragraphs, lists, bold, italic and links. The type scale is fixed
 * by the front end, so a Heading 2 here is the site's h2 and its size is not a
 * choice. Spacing between elements is one rhythm rather than per-element
 * values: a CMS heading cannot carry its own spacing, and a spacing field per
 * element is the design system spec §4 rules out.
 *
 * The notice lives inside this block rather than beside it because on the
 * original it sits inside the same measure. Two top-level blocks would each
 * bring their own padding and double the gap.
 */
export const richTextSection = defineType({
  name: 'richTextSection',
  title: 'Prose',
  type: 'object',
  fields: [
    defineField({
      name: 'notice',
      title: 'Opening callout',
      type: 'object',
      description: 'Optional. A bordered box above the prose.',
      fields: [
        defineField({ name: 'title', type: 'string' }),
        defineField({ name: 'body', type: 'text', rows: 3 }),
      ],
      options: { collapsible: true, collapsed: true },
    }),
    defineField({ name: 'body', title: 'Prose', type: 'blockContent' }),
    hiddenField,
  ],
  preview: sectionPreview('Prose'),
});
