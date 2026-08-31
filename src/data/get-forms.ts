import {
  forms as defaults,
  formById,
  type FieldIcon,
  type FieldType,
  type FormDefinition,
  type FormField,
} from './forms';
import { sanityClient, sanityEnabled } from '../lib/sanity/client';

/**
 * A form definition, from Sanity when it is configured and from `forms.ts`
 * otherwise.
 *
 * Deliberately the same shape and the same fetch-with-fallback arrangement as
 * `getSite()`, which the API route already uses successfully. That matters here
 * for a specific reason: the browser and the server endpoint both call this, so
 * they cannot disagree about what a form contains. A field added in the Studio
 * is rendered and enforced; a field removed stops being either.
 *
 * The result is memoised. A static build otherwise refetches this for every page
 * that renders a form, and the definitions cannot change mid-build.
 */

let cached: Promise<Map<string, FormDefinition>> | undefined;

interface FieldDoc {
  name?: string;
  type?: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  requiredMessage?: string;
  invalidMessage?: string;
  maxLength?: number;
  options?: Array<{ label?: string; value?: string }>;
  width?: string;
  icon?: string;
  rows?: number;
  autocomplete?: string;
}

interface FormDoc {
  formId?: string;
  name?: string;
  fields?: FieldDoc[];
  submitLabel?: string;
  successMessage?: string;
  errorMessage?: string;
  validationMessage?: string;
  recipientEmail?: string;
  subjectPrefix?: string;
  sendConfirmation?: boolean;
  confirmationSubject?: string;
  confirmationBody?: string;
}

const QUERY = `*[_type == "form" && !(_id in path("drafts.**"))]{
  formId, name, submitLabel, successMessage, errorMessage, validationMessage,
  recipientEmail, subjectPrefix, sendConfirmation, confirmationSubject, confirmationBody,
  "fields": fields[]{
    name, type, label, placeholder, required, helpText, requiredMessage, invalidMessage,
    maxLength, width, icon, rows, autocomplete,
    "options": options[]{ label, value }
  }
}`;

const FIELD_TYPES = new Set(['text', 'email', 'tel', 'textarea', 'select', 'checkbox', 'file']);
const ICONS = new Set(['user', 'envelope', 'phone', 'pencil']);

/**
 * Keeps only fields that can actually work.
 *
 * A field with no name cannot be submitted, and one with an unknown type has no
 * renderer — either would produce a control that silently does nothing. A
 * `select` with no options is dropped for the same reason.
 */
function fields(value: FieldDoc[] | undefined): FormField[] {
  return (value ?? []).flatMap((f): FormField[] => {
    if (!f?.name || !f.label || !f.type || !FIELD_TYPES.has(f.type)) return [];
    const options = (f.options ?? []).flatMap((o) =>
      o?.label && o.value ? [{ label: o.label, value: o.value }] : [],
    );
    if (f.type === 'select' && !options.length) return [];

    return [
      {
        name: f.name,
        type: f.type as FieldType,
        label: f.label,
        ...(f.placeholder ? { placeholder: f.placeholder } : {}),
        ...(f.required ? { required: true } : {}),
        ...(f.helpText ? { helpText: f.helpText } : {}),
        ...(f.requiredMessage ? { requiredMessage: f.requiredMessage } : {}),
        ...(f.invalidMessage ? { invalidMessage: f.invalidMessage } : {}),
        ...(typeof f.maxLength === 'number' ? { maxLength: f.maxLength } : {}),
        ...(options.length ? { options } : {}),
        ...(f.width === 'half' || f.width === 'full' ? { width: f.width } : {}),
        ...(f.icon && ICONS.has(f.icon) ? { icon: f.icon as FieldIcon } : {}),
        ...(typeof f.rows === 'number' ? { rows: f.rows } : {}),
        ...(f.autocomplete ? { autocomplete: f.autocomplete } : {}),
      },
    ];
  });
}

function merge(doc: FormDoc, fallback: FormDefinition): FormDefinition {
  const cmsFields = fields(doc.fields);
  return {
    id: fallback.id,
    name: doc.name ?? fallback.name,
    // An empty field list means an unfinished document, not a form with no
    // fields. Falling back keeps a working form on the page either way.
    fields: cmsFields.length ? cmsFields : fallback.fields,
    submitLabel: doc.submitLabel ?? fallback.submitLabel,
    sendingLabel: fallback.sendingLabel,
    successMessage: doc.successMessage ?? fallback.successMessage,
    errorMessage: doc.errorMessage ?? fallback.errorMessage,
    validationMessage: doc.validationMessage ?? fallback.validationMessage,
    ...(doc.recipientEmail ? { recipientEmail: doc.recipientEmail } : {}),
    subjectPrefix: doc.subjectPrefix ?? fallback.subjectPrefix,
    ...(doc.sendConfirmation ? { sendConfirmation: true } : {}),
    ...(doc.confirmationSubject ? { confirmationSubject: doc.confirmationSubject } : {}),
    ...(doc.confirmationBody ? { confirmationBody: doc.confirmationBody } : {}),
  };
}

async function load(): Promise<Map<string, FormDefinition>> {
  const map = new Map(defaults.map((f) => [f.id, f]));
  if (!sanityEnabled) return map;

  try {
    const docs = await sanityClient().fetch<FormDoc[]>(QUERY);
    for (const doc of docs ?? []) {
      const id = doc?.formId;
      if (!id) continue;
      const fallback = formById(id);
      // A form document with an id no route renders is ignored rather than
      // guessed at: without a committed default there is nothing to fall back
      // to, and a half-defined form is worse than none.
      if (!fallback) {
        console.warn(`[forms] Ignoring form "${id}": no route renders it.`);
        continue;
      }
      map.set(id, merge(doc, fallback));
    }
  } catch (error) {
    console.warn(
      '[forms] Could not read form definitions from Sanity; using src/data/forms.ts.',
      error instanceof Error ? error.message : error,
    );
  }
  return map;
}

export async function getForm(id: string): Promise<FormDefinition> {
  cached ??= load();
  const map = await cached;
  const form = map.get(id);
  if (!form) throw new Error(`Unknown form "${id}". Add it to src/data/forms.ts.`);
  return form;
}
