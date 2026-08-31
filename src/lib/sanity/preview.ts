import { createClient, type SanityClient } from '@sanity/client';
import { SANITY_API_VERSION, SANITY_DATASET, SANITY_PROJECT_ID } from './client';

/**
 * Sanity client for draft preview. Server-only.
 *
 * Separate from `sanityClient()` on purpose. That one is deliberately
 * token-free and pinned to `perspective: 'published'`, which is what guarantees
 * unpublished work can never reach a build. Giving it a token and a mode switch
 * would put that guarantee one mistaken argument away.
 *
 * This is only ever constructed by the preview route, which runs on request and
 * behind a secret. It needs a read token because drafts are not public.
 */

const env = (key: string): string | undefined => {
  const fromVite = (import.meta.env as Record<string, string | undefined>)[key];
  return fromVite ?? process.env[key];
};

/** A read-only token. It must never be given write access. */
export const previewToken = () => env('SANITY_PREVIEW_TOKEN');

/** The shared secret that gates the preview route. */
export const previewSecret = () => env('PREVIEW_SECRET');

export const previewAvailable = () => Boolean(previewToken() && previewSecret());

let cached: SanityClient | undefined;

export function previewClient(): SanityClient {
  const token = previewToken();
  if (!token || !SANITY_PROJECT_ID) {
    throw new Error('Preview is not configured. Set SANITY_PREVIEW_TOKEN and PREVIEW_SECRET.');
  }
  cached ??= createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    useCdn: false,
    token,
    // Drafts win over their published versions, which is what makes this a
    // preview of what publishing would produce rather than a list of drafts.
    perspective: 'drafts',
  });
  return cached;
}

export const PREVIEW_COOKIE = 'anchor-preview';
