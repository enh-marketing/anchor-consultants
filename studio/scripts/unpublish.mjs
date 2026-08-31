/**
 * Moves published documents back to drafts, so they keep their content but stop
 * appearing on the site. Sanity has no "draft" field — a document is either
 * published or not — so hiding one means moving it to the drafts namespace.
 *
 *   cd studio && npx sanity exec scripts/unpublish.mjs --with-user-token -- <slug> [<slug> ...]
 */
import { getCliClient } from 'sanity/cli';

const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!slugs.length) {
  console.error('Give at least one slug to unpublish.');
  process.exit(1);
}

const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ useCdn: false });

for (const slug of slugs) {
  const doc = await client.fetch(`*[slug.current == $slug && !(_id in path("drafts.**"))][0]`, {
    slug,
  });
  if (!doc) {
    console.log(`  ${slug}: no published document found, nothing to do`);
    continue;
  }
  const draftId = `drafts.${doc._id}`;
  const { _id, _rev, _createdAt, _updatedAt, ...content } = doc;
  await client.createOrReplace({ _id: draftId, ...content });
  await client.delete(_id);
  console.log(`  ${slug}: unpublished (kept as ${draftId})`);
}
