import { defineType, defineField } from 'sanity';

/**
 * Per-page SEO.
 *
 * Three principles run through this object.
 *
 * **Everything falls back.** Every field is optional, and the front end has a
 * fallback chain for each: Twitter falls back to Open Graph, Open Graph falls
 * back to the meta title and description, and those fall back to the page's own
 * title and hand-written description. An editor who fills nothing still gets a
 * correct page, which is what spec §6 asks for.
 *
 * **Indexing can only be tightened.** There is no "index this" switch, because
 * `IS_PRODUCTION_HOST` in code decides whether the site is indexable at all. A
 * staging build stays `noindex` whatever this document says, and no content edit
 * can index a page the route marked private. The two toggles below can only
 * remove permission, never grant it.
 *
 * **Nothing decorative.** The WordPress site let a plugin scrape descriptions
 * from body text, producing "No testimonials found" as a description (audit
 * defect #22). There is no auto-generation here and no keyword meta tag, which
 * search engines ignore.
 */
export const seo = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  options: { collapsible: true, collapsed: true },
  groups: [
    { name: 'basics', title: 'Basics', default: true },
    { name: 'social', title: 'Social sharing' },
    { name: 'advanced', title: 'Advanced' },
  ],
  fields: [
    // ---- basics ----
    defineField({
      name: 'metaTitle',
      title: 'Search title',
      type: 'string',
      group: 'basics',
      description:
        'What search results show. The site name is added automatically, so do not repeat it. Aim for 60 characters or fewer, or Google will cut it off. Leave empty to use the page title.',
      validation: (Rule) =>
        Rule.max(60).warning('Titles over 60 characters are usually truncated in search results.'),
    }),
    defineField({
      name: 'metaDescription',
      title: 'Meta description',
      type: 'text',
      rows: 3,
      group: 'basics',
      description:
        'The sentence under the title in search results. Write it for a reader deciding whether to click. 120 to 160 characters.',
      validation: (Rule) =>
        Rule.required()
          .min(120)
          .max(160)
          .error('Descriptions must be between 120 and 160 characters.'),
    }),
    defineField({
      name: 'focusKeyword',
      title: 'Target phrase (internal note)',
      type: 'string',
      group: 'basics',
      description:
        'A note for whoever writes this page. It is not published anywhere: keyword meta tags have been ignored by search engines for years, and a field that looked like it did something would be worse than none.',
    }),

    // ---- social sharing ----
    defineField({
      name: 'ogImage',
      title: 'Share image',
      type: 'altImage',
      group: 'social',
      description:
        'Shown when the page is shared. 1200x630 works everywhere. Leave empty to use the site default.',
    }),
    defineField({
      name: 'ogTitle',
      title: 'Share title',
      type: 'string',
      group: 'social',
      description: 'Only if the shared title should differ from the search title.',
    }),
    defineField({
      name: 'ogDescription',
      title: 'Share description',
      type: 'text',
      rows: 2,
      group: 'social',
      description: 'Only if the shared description should differ from the meta description.',
    }),
    defineField({
      name: 'twitterTitle',
      title: 'X title',
      type: 'string',
      group: 'social',
      description: 'Only if X should differ from the share title above.',
    }),
    defineField({
      name: 'twitterDescription',
      title: 'X description',
      type: 'text',
      rows: 2,
      group: 'social',
    }),
    defineField({
      name: 'twitterImage',
      title: 'X image',
      type: 'altImage',
      group: 'social',
      description: 'Only if X should use a different image from the share image.',
    }),

    // ---- advanced ----
    defineField({
      name: 'noindex',
      title: 'Hide from search engines',
      type: 'boolean',
      group: 'advanced',
      description:
        'Keeps the page live but asks search engines not to list it. There is no switch for the opposite: whether the site is indexable at all is decided by the build, so this can only ever hide a page, never expose one.',
      initialValue: false,
    }),
    defineField({
      name: 'nofollow',
      title: 'Do not follow links on this page',
      type: 'boolean',
      group: 'advanced',
      description: 'Rarely needed. Leave off unless you know why you want it.',
      initialValue: false,
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL',
      type: 'url',
      group: 'advanced',
      description:
        'Only for a page that deliberately duplicates one elsewhere. Must be a full address including https://. Leave empty and the page is its own canonical, which is almost always right.',
    }),
    defineField({
      name: 'breadcrumbTitle',
      title: 'Breadcrumb label',
      type: 'string',
      group: 'advanced',
      description: 'A shorter name for the breadcrumb trail, if the page title is long.',
    }),
    defineField({
      name: 'schemaType',
      title: 'Page type (structured data)',
      type: 'string',
      group: 'advanced',
      description:
        'Tells search engines what kind of page this is. Only set it if it is accurate: a wrong type is worse than none.',
      options: {
        list: [
          { title: 'Standard page', value: 'WebPage' },
          { title: 'About page', value: 'AboutPage' },
          { title: 'Contact page', value: 'ContactPage' },
          { title: 'Listing of other pages', value: 'CollectionPage' },
        ],
      },
    }),
  ],
});
