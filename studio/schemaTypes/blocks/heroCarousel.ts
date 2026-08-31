import { defineType, defineField } from 'sanity';
import { hiddenField, sectionPreview } from './_shared';

/**
 * The home page hero: a fading carousel of slides over a fixed backdrop.
 *
 * Slide count is capped at five. The carousel has no lazy loading of its own,
 * so every slide's artwork is in the initial markup, and an unbounded list
 * would quietly turn the largest page on the site into a much larger one.
 */
export const heroCarousel = defineType({
  name: 'heroCarousel',
  title: 'Hero carousel',
  type: 'object',
  fields: [
    defineField({
      name: 'slides',
      type: 'array',
      description: 'Each slide needs a heading and an image. Two to three reads best.',
      of: [
        {
          type: 'object',
          name: 'heroSlide',
          fields: [
            defineField({
              name: 'eyebrow',
              type: 'string',
              description: 'The small pill above the heading.',
            }),
            defineField({
              name: 'title',
              title: 'Heading',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({ name: 'body', type: 'text', rows: 3 }),
            defineField({
              name: 'image',
              title: 'Slide artwork',
              type: 'altImage',
              description: 'Shown at 492px wide on desktop, hidden below 992px.',
              validation: (Rule) => Rule.required(),
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'eyebrow', media: 'image' } },
        },
      ],
      validation: (Rule) => Rule.min(1).max(5),
    }),
    defineField({
      name: 'cta',
      title: 'Button',
      type: 'sectionLink',
      description: 'The same button appears on every slide.',
    }),
    defineField({
      name: 'backdrop',
      type: 'altImage',
      description:
        'Full-width photograph behind the hero. Leave empty to keep the one that ships with the theme.',
    }),
    hiddenField,
  ],
  preview: sectionPreview('Hero carousel'),
});
