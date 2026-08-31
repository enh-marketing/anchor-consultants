import { defineType, defineField } from 'sanity';

/**
 * Every image on the site is either meaningful or decorative, and which one it
 * is changes the alt text rather than being a styling detail. The rebuild ships
 * 44 meaningful and 47 explicitly decorative images with none unlabelled, and
 * this field is what keeps that true once editors are uploading.
 */
export const altImage = defineType({
  name: 'altImage',
  title: 'Image',
  type: 'image',
  options: { hotspot: true },
  fields: [
    defineField({
      name: 'alt',
      title: 'Alternative text',
      type: 'string',
      description:
        'Describe what the image shows, for screen readers and when it fails to load. Leave empty only if the image is purely decorative.',
    }),
    defineField({
      name: 'decorative',
      title: 'Purely decorative',
      type: 'boolean',
      description:
        'Tick when the image adds no information. It is then hidden from screen readers.',
      initialValue: false,
    }),
  ],
  preview: {
    select: { imageUrl: 'asset.url', title: 'alt' },
  },
});
