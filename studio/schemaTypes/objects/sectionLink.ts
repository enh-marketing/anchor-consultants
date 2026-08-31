import { defineType, defineField } from 'sanity';

/**
 * A label and a destination, used wherever a section carries a button or a
 * text link.
 *
 * Deliberately no style field. The button variants in `Button.astro` are tied
 * to where a button sits (the About section's teal, the navy used everywhere
 * else), and that is a design decision the section already encodes. Exposing it
 * would let an editor put the wrong variant in the wrong place, which is
 * exactly the failure mode spec §4 asks us to prevent.
 */
export const sectionLink = defineType({
  name: 'sectionLink',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      description: 'The text on the button or link.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'href',
      title: 'Destination',
      type: 'string',
      description: 'A site path such as /contact/, or a full URL.',
      validation: (Rule) =>
        Rule.required().custom((value) => {
          if (typeof value !== 'string') return true;
          if (value.startsWith('/')) return true;
          if (/^https?:\/\//.test(value)) return true;
          if (value.startsWith('mailto:') || value.startsWith('tel:')) return true;
          return 'Use a path starting with /, or a full http(s), mailto: or tel: URL.';
        }),
    }),
  ],
  preview: { select: { title: 'label', subtitle: 'href' } },
});
