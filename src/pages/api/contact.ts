import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { validateForm, hasFormErrors, CV_MAX_BYTES, type FormValues } from '../../lib/forms';
import { getSite } from '../../data/get-site';
import { getForm } from '../../data/get-forms';
import {
  fingerprint,
  isRateLimited,
  storeSubmission,
  RATE_WINDOW_MINUTES,
  type SubmissionEntry,
} from '../../lib/submissions';

/**
 * The only server route in the build. Everything else prerenders.
 *
 * Delivery and verification are both fully implemented and both are inert
 * until the matching environment variables exist, so adding credentials is a
 * deployment change rather than a code change. See `.env.example`.
 *
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASSWORD  — delivers the mail
 *   CONTACT_TO                                          — where it goes
 *   RECAPTCHA_SECRET_KEY                                — verifies the v3 token
 *
 * With nothing configured the endpoint still validates and logs, so the front
 * end can be exercised end to end. It never silently pretends to have sent
 * something: the response carries `delivered: false` and the reason, and the
 * forms say so in plain words.
 *
 * Validation is driven by the form's own definition, loaded through the same
 * `getForm()` the browser rendered from. That is deliberate and it is the point
 * of milestone 21: a field made required in the Studio is enforced here without
 * this file changing. Hardcoding the rules is how a CMS ends up with validation
 * that only looks enforced — the browser asks for a field the server never
 * checks.
 */
export const prerender = false;

const env = (key: string) => import.meta.env[key] ?? process.env[key];

const RECAPTCHA_MIN_SCORE = 0.5;

interface Result {
  ok: boolean;
  delivered: boolean;
  reason?: string;
  errors?: Record<string, string>;
}

const json = (body: Result, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Returns null when reCAPTCHA is not configured, so the flow still works. */
async function verifyRecaptcha(
  token: string | undefined,
): Promise<{ ok: boolean; reason?: string } | null> {
  const secret = env('RECAPTCHA_SECRET_KEY');
  if (!secret) return null;
  if (!token) return { ok: false, reason: 'Missing reCAPTCHA token.' };

  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await res.json()) as { success: boolean; score?: number };
  if (!data.success) return { ok: false, reason: 'reCAPTCHA rejected the request.' };
  if (typeof data.score === 'number' && data.score < RECAPTCHA_MIN_SCORE) {
    return { ok: false, reason: 'reCAPTCHA score too low.' };
  }
  return { ok: true };
}

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, delivered: false, reason: 'Could not read the submission.' }, 400);
  }

  const kind = String(form.get('kind') ?? 'contact');
  const honeypot = String(form.get('website') ?? '');

  // Silently accept bot submissions so they get no signal either way.
  if (honeypot.trim()) return json({ ok: true, delivered: false, reason: 'Discarded.' });

  // An unknown form id means the request did not come from a form this site
  // renders. Nothing is validated against a guess.
  let definition;
  try {
    definition = await getForm(kind);
  } catch {
    return json({ ok: false, delivered: false, reason: 'Unknown form.' }, 400);
  }

  /**
   * Values read strictly from the definition.
   *
   * Anything the form does not declare is ignored rather than forwarded, so an
   * extra field injected into the POST cannot end up in the notification email.
   */
  const values: FormValues = {};
  const files: Record<string, File> = {};
  for (const field of definition.fields) {
    const entry = form.get(field.name);
    if (field.type === 'file') {
      const file = entry instanceof File && entry.name ? entry : null;
      if (file) files[field.name] = file;
      values[field.name] = file ? { name: file.name, size: file.size, type: file.type } : null;
    } else {
      values[field.name] = typeof entry === 'string' ? entry : '';
    }
  }

  const errors = validateForm(definition, values);
  if (hasFormErrors(errors)) {
    return json({ ok: false, delivered: false, errors }, 422);
  }

  // Size is re-checked against the real upload rather than the reported figure.
  for (const [name, file] of Object.entries(files)) {
    if (file.size > CV_MAX_BYTES) {
      return json(
        { ok: false, delivered: false, errors: { [name]: 'That file is over 5 MB.' } },
        413,
      );
    }
  }

  // Rate limit before reCAPTCHA, so a flood costs us no calls to Google.
  const submitter = fingerprint(request);
  if (await isRateLimited(submitter)) {
    return json(
      {
        ok: false,
        delivered: false,
        reason: `That is several messages in a short time. Please wait ${RATE_WINDOW_MINUTES} minutes, or call us.`,
      },
      429,
    );
  }

  // `requireCaptcha` defaults to on, and turning it off is a real reduction in
  // protection rather than a preference — hence the log line.
  const wantsCaptcha = definition.requireCaptcha !== false;
  if (!wantsCaptcha) {
    console.warn(`[contact] reCAPTCHA is disabled for the "${definition.id}" form.`);
  }
  const captcha = wantsCaptcha
    ? await verifyRecaptcha(String(form.get('token') ?? '') || undefined)
    : null;
  if (captcha && !captcha.ok) {
    return json(
      { ok: false, delivered: false, reason: captcha.reason ?? 'Verification failed.' },
      403,
    );
  }

  const site = await getSite();

  /** A human-readable line per declared field, in the order the form shows them. */
  const lines = definition.fields
    .filter((field) => field.type !== 'file')
    .map((field) => {
      const value = values[field.name];
      const text = typeof value === 'string' ? value.trim() : '';
      return text ? `${field.label}: ${text}` : null;
    })
    .filter((line): line is string => line !== null);

  const attachedNames = Object.values(files).map((f) => f.name);
  if (attachedNames.length) lines.push('', `Attached: ${attachedNames.join(', ')}`);

  /** The same values as the email, kept as label-and-value pairs for the archive. */
  const entries: SubmissionEntry[] = definition.fields
    .filter((field) => field.type !== 'file' && field.type !== 'checkbox')
    .flatMap((field) => {
      const value = typeof values[field.name] === 'string' ? String(values[field.name]).trim() : '';
      return value ? [{ label: field.label, value }] : [];
    });

  // Consent is only recorded when the form actually asks for it. A stored
  // `false` on a form with no tick box would be a claim about something nobody
  // was ever shown.
  const consentField = definition.fields.find((field) => field.type === 'checkbox');
  const consent = consentField
    ? values[consentField.name] === 'on' || values[consentField.name] === 'true'
    : undefined;

  // Path only, and only if it looks like one. The value arrives from the client.
  const rawSource = String(form.get('source') ?? '');
  const sourcePage = /^\/[\w\-/.]*$/.test(rawSource) ? rawSource : '';

  // Used for Reply-To and the confirmation, when the form collects an address.
  const emailField = definition.fields.find((field) => field.type === 'email');
  const replyTo = emailField ? String(values[emailField.name] ?? '').trim() : '';
  const nameField = definition.fields.find((field) => field.name === 'name');
  const submitterName = nameField ? String(values[nameField.name] ?? '').trim() : '';

  const smtpConfigured = Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASSWORD'));
  if (!smtpConfigured) {
    // Deliberately loud: this must not look like a working send.
    console.warn(
      `[contact] SMTP is not configured — submission accepted but NOT delivered.\n` +
        `  form: ${definition.id}\n` +
        lines.map((line) => `  ${line}`).join('\n'),
    );
    // Still archived: the enquiry is real even when the mail is not going out,
    // and `delivered: false` on the record is what flags it for following up.
    await storeSubmission(
      {
        formId: definition.id,
        formName: definition.name,
        summary: submitterName || replyTo || definition.name,
        entries,
        attachments: attachedNames,
        sourcePage,
        consent,
        delivered: false,
      },
      submitter,
    );

    return json({
      ok: true,
      delivered: false,
      reason: 'SMTP credentials are not configured on this environment.',
    });
  }

  const port = Number(env('SMTP_PORT') ?? 587);
  const transport = nodemailer.createTransport({
    host: env('SMTP_HOST'),
    port,
    // 465 is implicit TLS; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: env('SMTP_USER'), pass: env('SMTP_PASSWORD') },
  });

  // CONTACT_TO wins over the form's recipient, which wins over the site email.
  // The environment stays the final say so a content edit cannot redirect
  // enquiries somewhere they were never meant to go.
  const to = env('CONTACT_TO') ?? definition.recipientEmail ?? site.contact.email.address;
  const from = env('SMTP_FROM') ?? env('SMTP_USER')!;

  const attachments = await Promise.all(
    Object.values(files).map(async (file) => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type || 'application/octet-stream',
    })),
  );

  try {
    await transport.sendMail({
      to,
      from,
      // The visitor's address goes in Reply-To, never in From: sending as
      // them would fail SPF and DMARC on most providers.
      ...(replyTo ? { replyTo: submitterName ? `${submitterName} <${replyTo}>` : replyTo } : {}),
      subject: submitterName
        ? `${definition.subjectPrefix} — ${submitterName}`
        : definition.subjectPrefix,
      text: lines.join('\n'),
      ...(attachments.length ? { attachments } : {}),
    });
  } catch (error) {
    // Never report success for a send that failed.
    console.error('[contact] SMTP send failed', error);
    return json(
      {
        ok: false,
        delivered: false,
        reason: 'We could not send your message just now. Please call or email us directly.',
      },
      502,
    );
  }

  /**
   * Acknowledgement to the submitter, when the form asks for one.
   *
   * Sent as plain text on purpose. The body is editable content, and rendering
   * editable content as HTML into an email is how a content field becomes an
   * injection vector — spec §22 rules that out, and a plain-text
   * acknowledgement reads perfectly well.
   *
   * A failure here is logged and swallowed: the office already has the enquiry,
   * and telling the visitor their message failed because a courtesy email did
   * would be wrong.
   */
  if (definition.sendConfirmation && replyTo && definition.confirmationBody) {
    try {
      await transport.sendMail({
        to: replyTo,
        from,
        replyTo: to,
        subject: definition.confirmationSubject ?? `Thank you for contacting ${site.name}`,
        text: definition.confirmationBody,
      });
    } catch (error) {
      console.error('[contact] confirmation email failed (enquiry was delivered)', error);
    }
  }

  const stored = await storeSubmission(
    {
      formId: definition.id,
      formName: definition.name,
      summary: submitterName || replyTo || definition.name,
      entries,
      attachments: attachedNames,
      sourcePage,
      consent,
      delivered: true,
    },
    submitter,
  );
  if (!stored) {
    // The visitor is not told: their message was delivered, which is what they
    // care about. The warning in the log is for whoever runs the deployment.
    console.warn('[contact] enquiry delivered but not archived');
  }

  return json({ ok: true, delivered: true });
};

/** Anything other than POST. */
export const ALL: APIRoute = () =>
  json({ ok: false, delivered: false, reason: 'Method not allowed.' }, 405);
