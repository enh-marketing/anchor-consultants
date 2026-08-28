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

  if ((input.message ?? '').length > 5000) errors.message = 'Please keep your message under 5000 characters.';

  return errors;
}

export function validateCv(file: { name: string; size: number; type: string } | null): Errors {
  if (!file || !file.name) return { file: 'Please choose a CV to upload.' };
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  const okExt = (CV_ACCEPT as readonly string[]).includes(ext);
  const okMime = !file.type || (CV_MIME as readonly string[]).includes(file.type);
  if (!okExt || !okMime) return { file: 'Please upload a PDF or Word document.' };
  if (file.size > CV_MAX_BYTES) return { file: 'That file is over 5 MB. Please upload a smaller one.' };
  return {};
}

export const hasErrors = (errors: Errors) => Object.keys(errors).length > 0;
