import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The financing estimator.
 *
 * Only the heading is editable. The slider ranges, the maths and the labels are
 * not content: a wrong minimum or a mislabelled rate field would produce a
 * figure a visitor might act on. The disclaimer under it already lives in Site
 * Settings, which is where a change to the wording belongs.
 */
export const emiCalculator = defineType({
  name: 'emiCalculator',
  title: 'Financing calculator',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    hiddenField,
  ],
  preview: sectionPreview('Financing calculator', 'title'),
});
