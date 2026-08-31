/**
 * Creates the siteSettings singleton from the values in src/data/site.ts.
 *
 *   cd studio && npx sanity exec scripts/import-site-settings.mjs --with-user-token
 *   cd studio && npx sanity exec scripts/import-site-settings.mjs --with-user-token -- --dry-run
 *
 * The document id is fixed as `siteSettings`, which is what makes it a
 * singleton: the Studio structure opens that exact id, and re-running this
 * replaces it rather than creating a second one.
 *
 * Only the stored fields are written. The tel:, mailto: and wa.me hrefs are
 * derived at build time from the single E.164 number, so they are deliberately
 * absent here.
 *
 * Three groups of fields are deliberately left unwritten, because empty is the
 * correct default rather than a gap:
 *
 *   branding      the committed logo is build-optimised and the favicon is an
 *                 SVG, sharper at any size than a raster. Uploading should be a
 *                 deliberate act, not a migration artefact.
 *   opening hours the site shows none today; a value adds a contact-page row.
 *   social        the original's links pointed at bare platform home pages
 *                 rather than real profiles (audit defect #20).
 */
import { getCliClient } from 'sanity/cli';
import { site } from '../../src/data/site.ts';

const dry = process.argv.includes('--dry-run');
const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ useCdn: false });

const link = ({ label, href, hasChildren }, i, type) => ({
  _type: type,
  _key: `k${i}`,
  label,
  href,
  ...(hasChildren ? { hasChildren: true } : {}),
});

const doc = {
  _id: 'siteSettings',
  _type: 'siteSettings',
  name: site.name,
  legalName: site.legalName,
  tagline: site.tagline,
  description: site.description,

  phoneE164: site.contact.phone.e164,
  phoneDisplay: site.contact.phone.display,
  email: site.contact.email.address,
  whatsappNumber: site.contact.whatsapp.number,
  addressLines: [...site.contact.address.lines],
  mapsUrl: site.contact.address.mapsUrl,
  mapsEmbedQuery: site.contact.address.mapsEmbedQuery,
  // Empty in site.ts, and empty is the intended state: the site shows no
  // opening hours today, so writing a value here would add a row to the
  // contact page that nobody asked for.
  ...(site.contact.hours ? { businessHours: site.contact.hours } : {}),

  nav: site.nav.map((l, i) => link(l, i, 'navItem')),
  footerLinks: site.footerLinks.map((l, i) => link(l, i, 'footerLink')),
  legalLinks: site.legalLinks.map((l, i) => link(l, i, 'legalLink')),
  // Empty by design (audit defect #20). Nothing renders while it is empty.
  social: site.social.map((profile, i) => ({
    _type: 'socialProfile',
    _key: `s${i}`,
    platform: profile.platform,
    url: profile.url,
  })),

  blogSearchLabel: site.blog.searchLabel,
  blogSearchPlaceholder: site.blog.searchPlaceholder,
  blogRecentTitle: site.blog.recentTitle,
  blogArchivesTitle: site.blog.archivesTitle,
  blogCategoriesTitle: site.blog.categoriesTitle,
  blogFilterEmpty: site.blog.filterEmpty,
  blogFilterReset: site.blog.filterReset,

  footerPitch: site.footer.pitch,
  footerLinksTitle: site.footer.linksTitle,
  footerContactTitle: site.footer.contactTitle,
  footerButtons: site.footer.buttons.map((b, i) => ({
    _type: 'footerButton',
    _key: `b${i}`,
    label: b.label,
    action: b.action,
    ...(b.dialog ? { dialog: b.dialog } : {}),
    ...(b.href ? { href: b.href } : {}),
  })),

  ctaPrimary: { label: site.cta.primary.label, href: site.cta.primary.href },
  ctaHeader: { label: site.cta.header.label, href: site.cta.header.href },

  disclaimerFooter: site.disclaimers.footer,
  disclaimerCalculator: site.disclaimers.calculator,
  creditText: site.credit.text,
  creditHref: site.credit.href,
};

if (dry) {
  console.log(JSON.stringify(doc, null, 2));
  console.log('\nDRY RUN — nothing written.');
} else {
  await client.createOrReplace(doc);
  console.log('siteSettings written.');
  console.log(`  name      : ${doc.name}`);
  console.log(`  phone     : ${doc.phoneE164}  (shown as ${doc.phoneDisplay})`);
  console.log(`  email     : ${doc.email}`);
  console.log(`  nav       : ${doc.nav.length} items`);
  console.log(`  footer    : ${doc.footerLinks.length} links, ${doc.legalLinks.length} legal`);
  console.log(`  social    : ${doc.social.length} (empty by design — audit defect #20)`);
  console.log(`  hours     : ${doc.businessHours ?? '(none — nothing rendered)'}`);
  console.log(
    `  ftr btns  : ${doc.footerButtons.map((b) => `${b.label} [${b.action}]`).join(', ')}`,
  );
  console.log('  branding  : no images written — the committed assets are the better default');
}
