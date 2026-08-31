/**
 * Deletes form submissions older than a retention window.
 *
 *   cd studio && npx sanity exec scripts/prune-submissions.mjs --with-user-token -- --dry-run
 *   cd studio && npx sanity exec scripts/prune-submissions.mjs --with-user-token -- --days=365
 *
 * Enquiries are personal data. Keeping them indefinitely is a liability rather
 * than a feature: the longer they sit there, the more there is to lose, and
 * "we still have every enquiry since launch" is not a position anyone wants to
 * explain. This is the mechanism for a retention policy; the policy itself —
 * how many days — is the client's to set.
 *
 * Defaults to a dry run in all but name: `--days` is required, so nobody
 * deletes anything by running this to see what it does.
 */
import { getCliClient } from 'sanity/cli';

const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ useCdn: false });
const dry = process.argv.includes('--dry-run');
const arg = process.argv.find((a) => a.startsWith('--days='));

if (!arg) {
  console.error(
    'Refusing to run without --days. Example: --days=365 --dry-run\n' +
      'Decide the retention window deliberately rather than accepting a default.',
  );
  process.exit(1);
}

const days = Number(arg.slice('--days='.length));
if (!Number.isFinite(days) || days < 1) {
  console.error(`--days must be a positive number, got "${arg}".`);
  process.exit(1);
}

const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
const stale = await client.fetch(
  `*[_type == "submission" && submittedAt < $cutoff]{ _id, submittedAt, summary } | order(submittedAt asc)`,
  { cutoff },
);

console.log(`Retention window: ${days} days (anything before ${cutoff.slice(0, 10)})`);
console.log(`Matching submissions: ${stale.length}`);
for (const doc of stale.slice(0, 10)) {
  console.log(`  ${doc.submittedAt?.slice(0, 10)}  ${doc.summary ?? '(no summary)'}`);
}
if (stale.length > 10) console.log(`  … and ${stale.length - 10} more`);

if (!stale.length) {
  console.log('\nNothing to delete.');
} else if (dry) {
  console.log('\nDRY RUN — nothing deleted. Re-run without --dry-run to delete these.');
} else {
  // One transaction, so a partial failure leaves nothing half-deleted.
  const tx = stale.reduce((t, doc) => t.delete(doc._id), client.transaction());
  await tx.commit();
  console.log(`\nDeleted ${stale.length} submission(s).`);
}
