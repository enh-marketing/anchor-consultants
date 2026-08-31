import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';
import { validateContact, validateCv, hasErrors, CV_MAX_BYTES } from '../../lib/forms';
import { getSite } from '../../data/get-site';

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

  const payload = {
    name: String(form.get('name') ?? ''),
    email: String(form.get('email') ?? ''),
    phone: String(form.get('phone') ?? ''),
    message: String(form.get('message') ?? ''),
  };

  let errors = kind === 'cv' ? {} : validateContact(payload);

  let cv: File | null = null;
  if (kind === 'cv') {
    const entry = form.get('cv');
    cv = entry instanceof File ? entry : null;
    errors = {
      ...errors,
      ...validateCv(cv ? { name: cv.name, size: cv.size, type: cv.type } : null),
    };
    // A CV submission still needs a way to reply.
    const contactErrors = validateContact({ ...payload, message: '' });
    if (contactErrors.email) errors.email = contactErrors.email;
    if (contactErrors.name) errors.name = contactErrors.name;
  }

  if (hasErrors(errors)) {
    return json({ ok: false, delivered: false, errors: errors as Record<string, string> }, 422);
  }

  if (cv && cv.size > CV_MAX_BYTES) {
    return json({ ok: false, delivered: false, errors: { file: 'That file is over 5 MB.' } }, 413);
  }

  const captcha = await verifyRecaptcha(String(form.get('token') ?? '') || undefined);
  if (captcha && !captcha.ok) {
    return json(
      { ok: false, delivered: false, reason: captcha.reason ?? 'Verification failed.' },
      403,
    );
  }

  const smtpConfigured = Boolean(env('SMTP_HOST') && env('SMTP_USER') && env('SMTP_PASSWORD'));
  if (!smtpConfigured) {
    // Deliberately loud: this must not look like a working send.
    console.warn(
      `[contact] SMTP is not configured — submission accepted but NOT delivered.\n` +
        `  kind: ${kind}\n  name: ${payload.name}\n  email: ${payload.email}\n` +
        `  phone: ${payload.phone}\n  file: ${cv ? `${cv.name} (${cv.size} bytes)` : 'none'}`,
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

  const to = env('CONTACT_TO') ?? (await getSite()).contact.email.address;
  const from = env('SMTP_FROM') ?? env('SMTP_USER')!;
  const isCv = kind === 'cv';

  const lines = [
    `Name:  ${payload.name}`,
    `Email: ${payload.email}`,
    ...(payload.phone ? [`Phone: ${payload.phone}`] : []),
    '',
    isCv ? 'A CV was attached to this submission.' : payload.message || '(no message)',
  ];

  try {
    await transport.sendMail({
      to,
      from,
      // The visitor's address goes in Reply-To, never in From: sending as
      // them would fail SPF and DMARC on most providers.
      replyTo: `${payload.name} <${payload.email}>`,
      subject: isCv ? `CV submission — ${payload.name}` : `Website enquiry — ${payload.name}`,
      text: lines.join('\n'),
      ...(cv
        ? {
            attachments: [
              {
                filename: cv.name,
                content: Buffer.from(await cv.arrayBuffer()),
                contentType: cv.type || 'application/octet-stream',
              },
            ],
          }
        : {}),
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

  return json({ ok: true, delivered: true });
};

/** Anything other than POST. */
export const ALL: APIRoute = () =>
  json({ ok: false, delivered: false, reason: 'Method not allowed.' }, 405);
