/**
 * reCAPTCHA v3, client side.
 *
 * The site key is public by design, so it comes from `PUBLIC_RECAPTCHA_SITE_KEY`
 * and is inlined into the bundle at build time. The matching secret is
 * server-only and lives in `RECAPTCHA_SECRET_KEY`, read by
 * `src/pages/api/contact.ts`. Nothing else needs either value.
 *
 * With no key set this is inert: the script is never loaded, no token is
 * produced, and the endpoint skips verification. That keeps the forms fully
 * testable before the client supplies credentials, and means adding the keys
 * is a deployment change rather than a code change.
 *
 * The script is loaded lazily, on the first submit that needs a token, rather
 * than on every page. reCAPTCHA is roughly 100 KB of third-party JavaScript
 * and adds a badge; loading it up front would undo much of the work in
 * milestone 12 for a script most visitors never trigger.
 */

const SITE_KEY = import.meta.env['PUBLIC_RECAPTCHA_SITE_KEY'] ?? '';

interface Grecaptcha {
  ready: (cb: () => void) => void;
  execute: (key: string, opts: { action: string }) => Promise<string>;
}

const grecaptcha = () => (window as unknown as { grecaptcha?: Grecaptcha }).grecaptcha;

let loader: Promise<Grecaptcha | null> | undefined;

/** Injects the reCAPTCHA script once, resolving when it is usable. */
function load(): Promise<Grecaptcha | null> {
  loader ??= new Promise((resolve) => {
    const existing = grecaptcha();
    if (existing) return resolve(existing);

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(SITE_KEY)}`;
    script.async = true;
    script.onload = () => resolve(grecaptcha() ?? null);
    // A blocked or failed script must not block the submission.
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return loader;
}

/**
 * Returns a v3 token for `action`, or undefined when reCAPTCHA is not
 * configured or could not load. Callers should submit either way — the
 * server decides whether a missing token is acceptable.
 */
export async function recaptchaToken(action: string): Promise<string | undefined> {
  if (!SITE_KEY) return undefined;
  const g = await load();
  if (!g) return undefined;
  return new Promise<string | undefined>((resolve) => {
    // Never let a hung third-party script strand the submit button.
    const timeout = window.setTimeout(() => resolve(undefined), 5000);
    g.ready(async () => {
      try {
        resolve(await g.execute(SITE_KEY, { action }));
      } catch {
        resolve(undefined);
      } finally {
        window.clearTimeout(timeout);
      }
    });
  });
}

/** True when a site key is configured, so callers can show the required notice. */
export const recaptchaEnabled = Boolean(SITE_KEY);
