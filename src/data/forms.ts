/**
 * Form definitions.
 *
 * These are the committed defaults, and Sanity overrides them field by field —
 * the same arrangement as `src/data/site.ts`. Two things follow from that, and
 * both matter:
 *
 * **One definition drives both sides.** The browser renders from it and
 * `src/pages/api/contact.ts` validates against it, so adding a required field in
 * the Studio makes it required in both places. A form whose client and server
 * rules can drift is a form whose validation is decorative.
 *
 * **A CMS outage cannot take the forms down.** With no document, or with Sanity
 * switched off entirely, these values are used and the form works exactly as it
 * shipped.
 *
 * Presentation is limited to `width`, which is a named half-or-full choice
 * rather than a size: the original puts name and message full width with email
 * and phone side by side, and that is the only layout this design has.
 */

export type FieldType = 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'file';

/**
 * The small icon inside a field.
 *
 * Its own union rather than the site's `IconName`, because these are the form's
 * own 20x20 marks. The shared icon set is drawn on a 24x24 grid, so reusing it
 * would change the rendered SVG and the measured field.
 */
export type FieldIcon = 'user' | 'envelope' | 'phone' | 'pencil';

export interface FormField {
  /** Submitted under this name. Also the key errors come back under. */
  name: string;
  type: FieldType;
  /** Real label, visually hidden where the design is placeholder-only. */
  label: string;
  placeholder?: string;
  required?: boolean;
  /** Shown under the field, always visible. */
  helpText?: string;
  /** Replaces the default "this is required" wording. */
  requiredMessage?: string;
  /** Replaces the default format message for email, tel and file. */
  invalidMessage?: string;
  maxLength?: number;
  /** `select` only. */
  options?: Array<{ label: string; value: string }>;
  width?: 'full' | 'half';
  icon?: FieldIcon;
  /** `textarea` only. */
  rows?: number;
  autocomplete?: string;
}

export interface FormDefinition {
  /** Stable identifier, submitted with the form and used to look it up. */
  id: string;
  /** Internal name, never rendered. */
  name: string;
  fields: FormField[];
  submitLabel: string;
  sendingLabel: string;
  successMessage: string;
  errorMessage: string;
  /** Shown when a field fails, above the button. */
  validationMessage: string;
  /** Overrides the site email. */
  recipientEmail?: string;
  subjectPrefix: string;
  /** Sends the submitter an acknowledgement as well as notifying the office. */
  sendConfirmation?: boolean;
  confirmationSubject?: string;
  confirmationBody?: string;
}

const CONTACT_FIELDS: FormField[] = [
  {
    name: 'name',
    type: 'text',
    label: 'Full name',
    placeholder: 'Full Name',
    required: true,
    autocomplete: 'name',
    icon: 'user',
    width: 'full',
    maxLength: 100,
  },
  {
    name: 'email',
    type: 'email',
    label: 'Email address',
    placeholder: 'Email Address',
    required: true,
    autocomplete: 'email',
    icon: 'envelope',
    width: 'half',
  },
  {
    name: 'phone',
    type: 'tel',
    label: 'Phone number',
    placeholder: 'Phone Number',
    required: true,
    autocomplete: 'tel',
    icon: 'phone',
    width: 'half',
  },
  {
    name: 'message',
    type: 'textarea',
    label: 'Your question',
    placeholder: 'Question',
    icon: 'pencil',
    width: 'full',
    maxLength: 5000,
  },
];

export const forms: FormDefinition[] = [
  {
    id: 'contact',
    name: 'Enquiry form',
    fields: CONTACT_FIELDS,
    submitLabel: 'Submit Now',
    sendingLabel: 'Sending…',
    successMessage: 'Thank you. We will be in touch shortly.',
    errorMessage: 'Something went wrong. Please try again, or call us.',
    validationMessage: 'Please check the highlighted fields.',
    subjectPrefix: 'Website enquiry',
  },
  {
    id: 'cv',
    name: 'CV upload form',
    // Spelled out rather than spread from CONTACT_FIELDS: this form shows real
    // labels above each field, so it carries no placeholders and no in-field
    // icons. Reusing the contact fields would have added both.
    fields: [
      {
        name: 'name',
        type: 'text',
        label: 'Full name',
        required: true,
        autocomplete: 'name',
        width: 'full',
        maxLength: 100,
      },
      {
        name: 'email',
        type: 'email',
        label: 'Email address',
        required: true,
        autocomplete: 'email',
        width: 'full',
      },
      {
        name: 'cv',
        type: 'file',
        label: 'Your CV',
        required: true,
        helpText: 'PDF, DOC or DOCX. Maximum 5 MB.',
        invalidMessage: 'Please upload a PDF or Word document.',
        width: 'full',
      },
    ],
    submitLabel: 'Submit Now',
    sendingLabel: 'Sending…',
    successMessage: 'Thank you. We have received your CV.',
    errorMessage: 'Something went wrong. Please try again.',
    validationMessage: 'Please check the highlighted fields.',
    subjectPrefix: 'CV submission',
  },
];

export const formById = (id: string): FormDefinition | undefined => forms.find((f) => f.id === id);
