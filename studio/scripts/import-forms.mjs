/**
 * Creates the form documents from src/data/forms.ts.
 *
 *   cd studio && npx sanity exec scripts/import-forms.mjs --with-user-token
 *   cd studio && npx sanity exec scripts/import-forms.mjs --with-user-token -- --dry-run
 *
 * Ids are fixed as `form-<formId>` so re-running replaces rather than
 * duplicating. Only the stored fields are written: `sendingLabel` stays in code
 * because "Sending…" is interface state rather than content, and no credential
 * or notification secret belongs in a document anyone with the dataset can read.
 */
import { getCliClient } from 'sanity/cli';
import { forms } from '../../src/data/forms.ts';

const dry = process.argv.includes('--dry-run');
const client = getCliClient({ apiVersion: '2024-10-01' }).withConfig({ useCdn: false });

const docs = forms.map((form) => ({
  _id: `form-${form.id}`,
  _type: 'form',
  name: form.name,
  formId: form.id,
  ...(form.dialogTitle ? { dialogTitle: form.dialogTitle } : {}),
  ...(form.dialogIntro ? { dialogIntro: form.dialogIntro } : {}),
  fields: form.fields.map((field, i) => ({
    _type: 'formField',
    _key: `f${i}`,
    label: field.label,
    name: field.name,
    type: field.type,
    ...(field.required ? { required: true } : {}),
    ...(field.placeholder ? { placeholder: field.placeholder } : {}),
    ...(field.helpText ? { helpText: field.helpText } : {}),
    ...(field.requiredMessage ? { requiredMessage: field.requiredMessage } : {}),
    ...(field.invalidMessage ? { invalidMessage: field.invalidMessage } : {}),
    ...(field.maxLength ? { maxLength: field.maxLength } : {}),
    ...(field.width ? { width: field.width } : {}),
    ...(field.icon ? { icon: field.icon } : {}),
    ...(field.autocomplete ? { autocomplete: field.autocomplete } : {}),
    ...(field.options
      ? {
          options: field.options.map((o, j) => ({
            _type: 'fieldOption',
            _key: `o${j}`,
            label: o.label,
            value: o.value,
          })),
        }
      : {}),
  })),
  submitLabel: form.submitLabel,
  successMessage: form.successMessage,
  errorMessage: form.errorMessage,
  validationMessage: form.validationMessage,
  subjectPrefix: form.subjectPrefix,
  // Left unwritten on purpose: with no recipient the site email is used, which
  // is the correct default and the one place it should be changed.
}));

if (dry) {
  console.log(JSON.stringify(docs, null, 2));
  console.log('\nDRY RUN — nothing written.');
} else {
  for (const doc of docs) {
    await client.createOrReplace(doc);
    console.log(`wrote ${doc._id}: ${doc.fields.length} fields, button "${doc.submitLabel}"`);
  }
  console.log('\nRecipient left empty on every form, so the site email address is used.');
}
