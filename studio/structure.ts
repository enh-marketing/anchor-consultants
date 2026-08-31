import type { StructureResolver } from 'sanity/structure';

/**
 * Site Settings is a singleton: one document, edited in place, never listed.
 * Everything else is an ordinary collection ordered by the `order` field the
 * site sorts on, so the Studio list matches what visitors see.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Site Settings')
        .id('siteSettings')
        .child(S.document().schemaType('siteSettings').documentId('siteSettings')),
      S.divider(),
      S.documentTypeListItem('page').title('Pages'),
      S.documentTypeListItem('service').title('Services'),
      S.documentTypeListItem('post').title('Blog posts'),
      S.documentTypeListItem('category').title('Blog categories'),
      S.documentTypeListItem('tag').title('Blog tags'),
      S.documentTypeListItem('author').title('Authors'),
      S.documentTypeListItem('faq').title('FAQs'),
      S.documentTypeListItem('form').title('Forms'),
      S.documentTypeListItem('testimonial').title('Testimonials'),
      S.documentTypeListItem('teamMember').title('Team'),
    ]);
