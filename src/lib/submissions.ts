import { createHash } from 'node:crypto';
import { createClient } from '@sanity/client';
import { SANITY_PROJECT_ID } from './sanity/client';

/**
 * Storing and rate-limiting form submissions.
 *
 * Server-only. This module is imported by `src/pages/api/contact.ts` and by
 * nothing else, and it must stay that way: it constructs a write client from a
 * token that must never reach the browser.
 *
 * Submissions live in their own **private** dataset, not alongside the content.
 * The content dataset is public-read by design — that is what lets a static build
 * fetch pages without a credential — and once the repository went public the
 * project id was published with it, so anything in that dataset is readable by
 * anyone. Enquiries carry names, emails and phone numbers, so they are kept where
 * a token is required to read them (defect #29).
 *
 * Verified rather than assumed: a document written here is returned to a
 * tokenless query as an empty result, not a 401. A check that looked for a 401
 * would have concluded the dataset was public.
 *
 * Everything degrades rather than failing. With no write token, submissions are
 * not stored and the enquiry is still emailed — losing the archive is bad, but
 * losing the enquiry would be worse. With no salt, submissions are stored
 * without a fingerprint and rate limiting is off. Both cases warn loudly,
 * because silent degradation is how a site ends up believing it has protections
 * it does not.
 */

/**
 * Reads a variable from either environment.
 *
 * `import.meta.env` is Vite's and is undefined outside a Vite build, which this
 * module is otherwise fine in — the guard is what lets it be exercised from a
 * plain Node script rather than only through a running server.
 */
const env = (key: string): string | undefined => {
  const vite = typeof import.meta.env === 'undefined' ? undefined : import.meta.env[key];
  return vite ?? process.env[key];
};

/** How many submissions one fingerprint may make, and over what window. */
const RATE_LIMIT = 5;
const RATE_WINDOW_MINUTES = 10;

/**
 * The private dataset submissions are written to.
 *
 * Overridable so a staging deployment can keep its enquiries separate, but it
 * deliberately does not fall back to the content dataset: a typo in the variable
 * must not silently start writing personal data somewhere world-readable.
 */
const SUBMISSIONS_DATASET = () => env('SANITY_SUBMISSIONS_DATASET') ?? 'submissions';

export interface SubmissionEntry {
  label: string;
  value: string;
}

export interface SubmissionRecord {
  formId: string;
  formName: string;
  summary: string;
  entries: SubmissionEntry[];
  attachments: string[];
  sourcePage: string;
  consent?: boolean | undefined;
  delivered: boolean;
}

let warnedNoToken = false;
let warnedNoSalt = false;

function writeClient() {
  const token = env('SANITY_WRITE_TOKEN');
  if (!token || !SANITY_PROJECT_ID) return null;
  return createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SUBMISSIONS_DATASET(),
    apiVersion: '2024-10-01',
    token,
    useCdn: false,
  });
}

/**
 * A stable, non-reversible fingerprint for the submitter.
 *
 * Rate limiting needs to recognise a repeat submitter, not identify one, so the
 * address is never stored. The salt lives in the environment, so even a full
 * copy of the dataset cannot be turned back into a list of IP addresses.
 *
 * Returns null with a warning when no salt is configured, which switches rate
 * limiting off rather than hashing with something predictable.
 */
export function fingerprint(request: Request): string | null {
  const salt = env('SUBMISSION_SALT');
  if (!salt) {
    if (!warnedNoSalt) {
      warnedNoSalt = true;
      console.warn(
        '[submissions] SUBMISSION_SALT is not set — rate limiting is OFF and no submitter ' +
          'fingerprint will be stored. Set it in the deployment environment.',
      );
    }
    return null;
  }

  // Vercel puts the client address in x-forwarded-for. The first entry is the
  // client; the rest are proxies, which are not ours to trust.
  const forwarded = request.headers.get('x-forwarded-for') ?? '';
  const ip = forwarded.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

/**
 * True when this fingerprint has already submitted too often.
 *
 * Counted from the stored submissions rather than from a separate store, which
 * means no extra service and no state to keep in sync. It costs one query per
 * submission, and it holds across serverless instances — an in-memory counter
 * would not, since each cold start would forget everything.
 *
 * Fails open. If the count cannot be read, the submission is allowed: blocking
 * a real enquiry because a query failed is worse than letting one extra
 * through, and reCAPTCHA is still in front of this.
 */
export async function isRateLimited(hash: string | null): Promise<boolean> {
  if (!hash) return false;
  const client = writeClient();
  if (!client) return false;

  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60_000).toISOString();
  try {
    const count = await client.fetch<number>(
      `count(*[_type == "submission" && submitterHash == $hash && submittedAt > $since])`,
      { hash, since },
    );
    return typeof count === 'number' && count >= RATE_LIMIT;
  } catch (error) {
    console.warn(
      '[submissions] Could not check the rate limit; allowing the submission.',
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Stores a submission. Returns whether it was stored.
 *
 * A failure here is logged and reported back, never thrown: the caller has
 * already delivered the enquiry by email and must not tell the visitor their
 * message failed because the archive did.
 */
export async function storeSubmission(
  record: SubmissionRecord,
  hash: string | null,
): Promise<boolean> {
  const client = writeClient();
  if (!client) {
    if (!warnedNoToken) {
      warnedNoToken = true;
      console.warn(
        '[submissions] SANITY_WRITE_TOKEN is not set — submissions are NOT being stored. ' +
          'Enquiries are still emailed. Set it in the deployment environment.',
      );
    }
    return false;
  }

  try {
    await client.create({
      _type: 'submission',
      formId: record.formId,
      formName: record.formName,
      submittedAt: new Date().toISOString(),
      summary: record.summary,
      entries: record.entries.map((entry, i) => ({
        _type: 'submissionEntry',
        _key: `e${i}`,
        label: entry.label,
        value: entry.value,
      })),
      ...(record.attachments.length ? { attachments: record.attachments } : {}),
      ...(typeof record.consent === 'boolean' ? { consent: record.consent } : {}),
      sourcePage: record.sourcePage,
      delivered: record.delivered,
      ...(hash ? { submitterHash: hash } : {}),
    });
    return true;
  } catch (error) {
    console.error('[submissions] Could not store the submission', error);
    return false;
  }
}

export { RATE_LIMIT, RATE_WINDOW_MINUTES };
