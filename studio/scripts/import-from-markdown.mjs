/**
 * Runs the markdown import with the token the Sanity CLI already holds, so no
 * credential has to be created, pasted or stored anywhere.
 *
 *   cd studio && npx sanity exec scripts/import-from-markdown.mjs --with-user-token
 *   cd studio && npx sanity exec scripts/import-from-markdown.mjs --with-user-token -- --dry-run
 *   cd studio && npx sanity exec scripts/import-from-markdown.mjs --with-user-token -- --only=team
 *
 * `--only` takes a comma-separated list of services, posts, faqs, testimonials
 * or team. Prefer it over a full re-run: images upload fresh every time and
 * Sanity does not deduplicate them.
 *
 * This thin wrapper exists because `sanity/cli` only resolves inside the studio,
 * while the content and the import logic live at the repository root.
 */
import { getCliClient } from 'sanity/cli';
import { run } from '../../scripts/migrate-to-sanity.mjs';

const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({
  dataset: process.env.SANITY_DATASET ?? 'production',
  useCdn: false,
});

const dry = process.argv.includes('--dry-run');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const only = onlyArg
  ? onlyArg
      .slice('--only='.length)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : undefined;

if (!client.config().token) {
  console.error('The CLI supplied no token. Add --with-user-token to the sanity exec call.');
  process.exit(1);
}

await run({ client, dry, ...(only ? { only } : {}) });
