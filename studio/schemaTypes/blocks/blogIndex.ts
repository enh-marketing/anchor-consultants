import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The blog listing, with its sidebar.
 *
 * Posts are the `post` documents. What is editable here is the empty state,
 * because right now that is the whole page: both posts are drafts. With no
 * posts the sidebar has nothing to show, so the copy column runs full width
 * rather than leaving a two-thirds gap.
 */
export const blogIndex = defineType({
  name: 'blogIndex',
  title: 'Blog listing',
  type: 'object',
  fields: [
    defineField({
      name: 'emptyBody',
      title: 'Empty-state copy',
      type: 'text',
      rows: 2,
      description: 'Shown when there are no published posts. The link below follows it.',
    }),
    defineField({
      name: 'emptyCta',
      title: 'Empty-state link',
      type: 'sectionLink',
    }),
    hiddenField,
  ],
  preview: sectionPreview('Blog listing'),
});
