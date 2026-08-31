import { createClient, type SanityClient } from '@sanity/client';

/**
 * Sanity client, build-time only.
 *
 * The site is a static build, so every query runs once at build and nothing
 * here reaches the browser. That is why there is no token: the `production`
 * dataset is public-read, and a write token has no business in a static build.
 * Content changes are picked up by rebuilding, which is what a webhook on the
 * host should trigger.
 *
 * Everything is optional. With no project id configured `sanityEnabled` is
 * false and the content collections fall back to the markdown in
 * `src/content/`, so the site builds identically to before Sanity existed.
 * That is what makes this a switch rather than a migration cliff.
 */

const env = (key: string): string | undefined => {
  const fromVite = (import.meta.env as Record<string, string | undefined>)[key];
  return fromVite ?? process.env[key];
};

export const SANITY_PROJECT_ID = env('PUBLIC_SANITY_PROJECT_ID') ?? '';
export const SANITY_DATASET = env('PUBLIC_SANITY_DATASET') ?? 'production';
/** Pinned so a future API change cannot alter what an old build returns. */
export const SANITY_API_VERSION = '2024-10-01';

/** True when the build should read content from Sanity rather than markdown. */
export const sanityEnabled = Boolean(SANITY_PROJECT_ID);

let cached: SanityClient | undefined;

export function sanityClient(): SanityClient {
  if (!sanityEnabled) {
    throw new Error(
      'Sanity is not configured. Set PUBLIC_SANITY_PROJECT_ID to read content from Sanity.',
    );
  }
  cached ??= createClient({
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    apiVersion: SANITY_API_VERSION,
    // The CDN serves a cached copy; a static build wants the current content.
    useCdn: false,
    // No token, so drafts are never returned. Unpublished work stays unpublished.
    perspective: 'published',
  });
  return cached;
}
