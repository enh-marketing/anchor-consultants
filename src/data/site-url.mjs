// Canonical production origin. Used by astro.config.mjs (sitemap, canonicals)
// and by the SEO helpers.
//
// TODO(client): replace with the real production domain before launch.
// Until then this is a placeholder — it only affects absolute URLs in the
// sitemap, canonical tags and Open Graph metadata, never local development.
export const SITE_URL = 'https://anchorconsultants.example';

// Set to true only on the production build. Anything else emits
// `noindex, nofollow`, which is what the WordPress staging site does today
// and what we must not accidentally ship (audit defect #21).
export const IS_PRODUCTION_HOST = false;
