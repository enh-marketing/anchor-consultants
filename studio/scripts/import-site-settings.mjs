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

  nav: site.nav.map((l, i) => link(l, i, 'navItem')),
  footerLinks: site.footerLinks.map((l, i) => link(l, i, 'footerLink')),
  legalLinks: site.legalLinks.map((l, i) => link(l, i, 'legalLink')),
  social: site.social.map((l, i) => link(l, i, 'socialLink')),

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
}
