import { defineType, defineField } from 'sanity';
import { isUniqueSlug } from '../uniqueSlug';
import { isSafeSlug } from '../../../src/lib/slug';

/**
 * A page, built from an ordered list of sections.
 *
 * This is the type that makes spec §1 and §3 possible: add, remove, reorder,
 * duplicate and hide sections, all from the array below, with no code change.
 *
 * Two deliberate constraints:
 *
 * **The slug is the route.** `/` is the home page. Editing a slug changes a URL,
 * which is why the description says so out loud and why M23 adds redirects.
 *
 * **Indexing is not fully editable.** `metaDescription` and the rest of the SEO
 * object are content, but whether the site is indexable at all stays with
 * `IS_PRODUCTION_HOST` in code. A content edit that deindexed production would
 * be the single worst regression available in this system, so it is not on the
 * menu. M19 extends the SEO object; this document only carries it.
 */
export const page = defineType({
  name: 'page',
  title: 'Pages',
  type: 'document',
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Page title',
      type: 'string',
      group: 'content',
      description: 'Used in the browser tab and as the default for the SEO title.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      group: 'content',
      description:
        'The page URL. Use "/" for the home page. Changing this changes the address, and any existing links to the old one will break until a redirect is added.',
      options: { source: 'title', maxLength: 96, isUnique: isUniqueSlug },
      validation: (Rule) => Rule.required().custom((value) => isSafeSlug(value?.current)),
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      type: 'array',
      group: 'content',
      description:
        'The page, top to bottom. Drag to reorder. Each section has a "Hide" toggle, so a section can be taken off the page without losing its content.',
      of: [
        // Any page
        { type: 'pageBanner' },
        { type: 'richTextSection' },
        // Home page sections
        { type: 'heroCarousel' },
        { type: 'serviceHighlightRow' },
        { type: 'aboutSplit' },
        { type: 'servicesCarousel' },
        { type: 'emiCalculator' },
        { type: 'leaderProfile' },
        { type: 'faqAccordion' },
        { type: 'testimonialCarousel' },
        // Inner-page sections
        { type: 'aboutIntro' },
        { type: 'copyWithImage' },
        { type: 'skillsPanel' },
        { type: 'serviceCardGrid' },
        { type: 'testimonialGrid' },
        { type: 'blogIndex' },
        { type: 'errorPanel' },
        { type: 'mapEmbed' },
        { type: 'contactPanel' },
      ],
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({ name: 'seo', type: 'seo', group: 'seo' }),
  ],
  preview: {
    select: { title: 'title', slug: 'slug.current', sections: 'sections' },
    prepare({ title, slug, sections }) {
      const count = Array.isArray(sections) ? sections.length : 0;
      return {
        title: typeof title === 'string' ? title : 'Untitled page',
        subtitle: `${slug ?? 'no slug'} · ${count} section${count === 1 ? '' : 's'}`,
      };
    },
  },
});
