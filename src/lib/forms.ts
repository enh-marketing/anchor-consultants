/**
 * Form validation shared by the browser and the server endpoint.
 *
 * The same rules run in both places: the client for instant feedback, the
 * server because client-side validation is a convenience, never a control.
 */

export interface ContactSubmission {
  name: string;
  email: string;
  phone: string;
  message?: string;
  /** Honeypot. Real people leave this empty. */
  website?: string;
  /** reCAPTCHA v3 token, added by the client before submit. */
  token?: string;
}

export type FieldName = 'name' | 'email' | 'phone' | 'message' | 'file';

export type Errors = Partial<Record<FieldName, string>>;

/**
 * Deliberately permissive. Over-strict email regexes reject valid addresses;
 * the only reliable proof an address works is sending to it.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** UAE and international formats, allowing spaces, dashes and parentheses. */
const PHONE = /^\+?[\d\s().-]{7,20}$/;

export const CV_ACCEPT = ['.pdf', '.doc', '.docx'] as const;
export const CV_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;
export const CV_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export function validateContact(input: Partial<ContactSubmission>): Errors {
  const errors: Errors = {};
  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim();
  const phone = (input.phone ?? '').trim();

  if (name.length < 2) errors.name = 'Please enter your full name.';
  else if (name.length > 100) errors.name = 'That name is too long.';

  if (!email) errors.email = 'Please enter your email address.';
  else if (!EMAIL.test(email)) errors.email = 'That email address does not look right.';

  if (!phone) errors.phone = 'Please enter a phone number we can reach you on.';
  else if (!PHONE.test(phone)) errors.phone = 'That phone number does not look right.';

  if ((input.message ?? '').length > 5000)
    errors.message = 'Please keep your message under 5000 characters.';

  return errors;
}

export function validateCv(file: { name: string; size: number; type: string } | null): Errors {
  if (!file || !file.name) return { file: 'Please choose a CV to upload.' };
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const okExt = (CV_ACCEPT as readonly string[]).includes(ext);
  const okMime = !file.type || (CV_MIME as readonly string[]).includes(file.type);
  if (!okExt || !okMime) return { file: 'Please upload a PDF or Word document.' };
  if (file.size > CV_MAX_BYTES)
    return { file: 'That file is over 5 MB. Please upload a smaller one.' };
  return {};
}

export const hasErrors = (errors: Errors) => Object.keys(errors).length > 0;

// ---------------------------------------------------------------------------
// Generic validation, driven by a form definition (milestone 21)
//
// The rules come from the definition rather than being written per form, which
// is the whole point: the browser and `src/pages/api/contact.ts` both call
// `validateForm` with the same definition, so a field made required in the
// Studio is required in both places. Client-side validation stays a
// convenience; the server call is the control.
// ---------------------------------------------------------------------------

export interface FileLike {
  name: string;
  size: number;
  type: string;
}

export type FormValues = Record<string, string | FileLike | null | undefined>;

/** Errors keyed by field name, so a response maps straight onto the inputs. */
export type FormErrors = Record<string, string>;

const asText = (value: FormValues[string]): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Validates values against a definition.
 *
 * Order matters: a required field that is empty reports "required" and nothing
 * else, so a blank email is not also told its format is wrong.
 */
export function validateForm(form: FormDefinitionLike, values: FormValues): FormErrors {
  const errors: FormErrors = {};

  for (const field of form.fields) {
    const raw = values[field.name];

    if (field.type === 'file') {
      const file = raw && typeof raw === 'object' ? raw : null;
      if (!file || !file.name) {
        if (field.required) {
          errors[field.name] = field.requiredMessage ?? 'Please choose a file to upload.';
        }
        continue;
      }
      const fileError = validateCv(file).file;
      if (fileError) errors[field.name] = field.invalidMessage ?? fileError;
      continue;
    }

    if (field.type === 'checkbox') {
      const ticked = raw === 'on' || raw === 'true' || raw === '1';
      if (field.required && !ticked) {
        errors[field.name] = field.requiredMessage ?? 'Please tick this to continue.';
      }
      continue;
    }

    const text = asText(raw);

    if (!text) {
      if (field.required) {
        errors[field.name] =
          field.requiredMessage ?? `Please enter your ${field.label.toLowerCase()}.`;
      }
      continue;
    }

    if (field.maxLength && text.length > field.maxLength) {
      errors[field.name] = `Please keep this under ${field.maxLength} characters.`;
      continue;
    }

    if (field.type === 'email' && !EMAIL.test(text)) {
      errors[field.name] = field.invalidMessage ?? 'That email address does not look right.';
      continue;
    }

    if (field.type === 'tel' && !PHONE.test(text)) {
      errors[field.name] = field.invalidMessage ?? 'That phone number does not look right.';
      continue;
    }

    if (field.type === 'select' && field.options && !field.options.some((o) => o.value === text)) {
      // A value outside the list means the markup was tampered with, so the
      // wording stays generic rather than naming the allowed values.
      errors[field.name] = field.invalidMessage ?? 'Please choose one of the options.';
    }
  }

  return errors;
}

/**
 * The shape `validateForm` needs, structural rather than imported.
 *
 * `src/lib/forms.ts` is bundled into the browser, and importing the definition
 * module here would pull every form's copy into the client bundle alongside the
 * one being rendered.
 */
export interface FormDefinitionLike {
  fields: Array<{
    name: string;
    type: string;
    label: string;
    required?: boolean | undefined;
    requiredMessage?: string | undefined;
    invalidMessage?: string | undefined;
    maxLength?: number | undefined;
    options?: Array<{ label: string; value: string }> | undefined;
  }>;
}

export const hasFormErrors = (errors: FormErrors) => Object.keys(errors).length > 0;
