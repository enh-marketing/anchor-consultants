import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { IS_PRODUCTION_HOST } from '../data/site-url.mjs';

/**
 * Astro integration: two things that can only be done once the build exists.
 *
 * Both read or rewrite the built output rather than being told what to do, which
 * is what keeps them from falling out of step with whatever produced it.
 *
 * 1. Redirect patterns are widened to tolerate a trailing slash.
 * 2. `noindex` pages are removed from the sitemap.
 *
 * A sitemap that lists a URL whose page says `noindex` contradicts itself, and
 * the contradiction is the kind a crawler resolves against you.
 *
 * This reads the built HTML rather than being told which pages to skip, which
 * matters now that `noindex` can come from three places: the route
 * (`404.astro`, the privacy holding page), the environment
 * (`IS_PRODUCTION_HOST`), or an editor ticking "Hide from search engines" in
 * the Studio. A hardcoded exclusion list could only ever know about the first,
 * and it silently fell out of step the moment the CMS gained the toggle.
 *
 * Deriving it from the output means the sitemap and the robots tag cannot
 * disagree, whatever decided the value.
 *
 * It only runs on a production build. Every page on a staging build is
 * `noindex` by design, and a blanket like that is not a self-contradiction the
 * way a single hidden page inside an indexable site is — pruning there would
 * empty the sitemap and throw away something useful for checking what a build
 * actually produced.
 */
async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** `dist/client/about/index.html` → `/about/` */
function toPath(root, file) {
  const rel = relative(root, file).split(sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0, -'index.html'.length)}`;
  return `/${rel}`;
}

export function buildFixups() {
  return {
    name: 'build-fixups',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        await widenRedirectPatterns(logger);

        if (!IS_PRODUCTION_HOST) return;

        // `dir` is a file URL, and its pathname percent-encodes anything the
        // filesystem allows but URLs do not — a space in a directory name
        // becomes %20, which readdir then cannot find. fileURLToPath decodes it.
        const root = fileURLToPath(dir);

        let pages;
        try {
          pages = await htmlFiles(root);
        } catch (error) {
          // Loud rather than silent: a sitemap still listing noindex URLs is a
          // real SEO problem, and this failing quietly is how it would ship.
          logger.warn(
            `Could not read ${root} to prune the sitemap: ` +
              (error instanceof Error ? error.message : String(error)),
          );
          return;
        }

        const noindex = new Set();
        for (const file of pages) {
          const html = await readFile(file, 'utf8');
          const robots = /<meta\s+name="robots"\s+content="([^"]*)"/i.exec(html);
          if (robots && /noindex/i.test(robots[1])) noindex.add(toPath(root, file));
        }
        if (!noindex.size) return;

        // Every sitemap file the integration produced, not just the first.
        const sitemaps = pages.length
          ? (await readdir(root)).filter((f) => /^sitemap-\d+\.xml$/.test(f))
          : [];

        const removedPaths = [];
        for (const name of sitemaps) {
          const path = join(root, name);
          const xml = await readFile(path, 'utf8');
          const pruned = xml.replace(/<url>[\s\S]*?<\/url>/g, (block) => {
            const loc = /<loc>([^<]*)<\/loc>/.exec(block);
            if (!loc) return block;
            const pathname = new URL(loc[1]).pathname;
            if (noindex.has(pathname)) {
              removedPaths.push(pathname);
              return '';
            }
            return block;
          });
          if (pruned !== xml) await writeFile(path, pruned);
        }

        if (removedPaths.length) {
          const n = removedPaths.length;
          logger.info(
            `Removed ${n} noindex URL${n === 1 ? '' : 's'} from the sitemap: ` +
              `${removedPaths.sort().join(', ')}`,
          );
        }
      },
    },
  };
}

/**
 * Makes each redirect match with or without a trailing slash.
 *
 * Astro normalises a redirect key to its no-slash form, so `/old-page/` in the
 * config becomes the pattern `^/old-page$` — which does not match a request for
 * `/old-page/`. That is the shape most of the URLs needing a redirect actually
 * have, since WordPress served them with a trailing slash, so the redirect
 * would have missed exactly the traffic it exists for.
 *
 * Rewriting `$` to `/?$` on redirect routes only is the smallest fix that keeps
 * Astro's own config as the source of truth. Routes that are not redirects are
 * left alone: the filesystem handler and the function routes are Astro's and
 * the adapter's business.
 */
async function widenRedirectPatterns(logger) {
  const path = '.vercel/output/config.json';
  let config;
  try {
    config = JSON.parse(await readFile(path, 'utf8'));
  } catch {
    // Not a Vercel build. Nothing to do, and nothing worth warning about.
    return;
  }

  let widened = 0;
  for (const route of config.routes ?? []) {
    const isRedirect =
      typeof route?.status === 'number' &&
      route.status >= 300 &&
      route.status < 400 &&
      route.headers?.Location &&
      typeof route.src === 'string';
    if (!isRedirect) continue;
    if (route.src.endsWith('/?$')) continue;
    if (!route.src.endsWith('$')) continue;
    route.src = `${route.src.slice(0, -1)}/?$`;
    widened += 1;
  }

  if (widened) {
    await writeFile(path, JSON.stringify(config, null, 2));
    logger.info(
      `Made ${widened} redirect${widened === 1 ? '' : 's'} match with or without a trailing slash`,
    );
  }
}
