import { defineType, defineField } from 'sanity';

/**
 * Paths that are routes regardless of any document, kept in step with
 * `NAMED_ROUTES` in `src/lib/page.ts`.
 */
const RESERVED = [
  '/',
  '/about',
  '/services',
  '/testimonials',
  '/blog',
  '/contact',
  '/privacy-policy',
  '/404',
];

const trimmed = (path: string) => (path.length > 1 ? path.replace(/\/+$/, '') : path);

/**
 * Refuses a redirect aimed at a page that still exists.
 *
 * The build refuses these too, but a warning in a deploy log is only seen by
 * whoever deploys. This is the same check where the mistake is actually made.
 *
 * It matters more than it looks: Astro gives a redirect precedence over a page
 * route, so a redirect from `/about/` does not shadow the About page, it stops
 * the page being built at all.
 */
interface ValidationContext {
  getClient: (options: { apiVersion: string }) => {
    fetch: (query: string, params?: Record<string, unknown>) => Promise<unknown>;
  };
}

async function pathIsFree(value: unknown, context: ValidationContext) {
  if (typeof value !== 'string' || !value.startsWith('/')) return true;
  const path = trimmed(value);

  if (RESERVED.includes(path)) {
    return `${path} is a page on this site. Redirecting it would remove the page.`;
  }

  const client = context.getClient({ apiVersion: '2024-10-01' });
  const taken = (await client.fetch(
    `count(*[!(_id in path("drafts.**")) && (
      (_type == "page" && slug.current in [$path, $withSlash]) ||
      (_type == "service" && "/services/" + slug.current == $path) ||
      (_type == "post" && "/blog/" + slug.current == $path) ||
      (_type == "category" && "/blog/category/" + slug.current == $path)
    )])`,
    { path, withSlash: `${path}/` },
  )) as number;

  return taken > 0
    ? `${path} is a page on this site. Redirecting it would remove the page — rename or delete the page first.`
    : true;
}

/**
 * A redirect.
 *
 * Exists so a URL can change without breaking every link to the old one. That
 * matters most right after launch, when the WordPress URLs are still in search
 * results and in other people's bookmarks, and it matters again every time an
 * editor changes a slug — the page document says so in its own description.
 *
 * Emitted into the deployment's routing config at build time, so these are real
 * server redirects with a real status code. Not meta-refresh pages: those are
 * slower, they leave the old URL in history, and a crawler treats them as a
 * weaker signal than a 301.
 *
 * `from` is a path on this site. `to` may be a path or a full URL, because
 * moving a page to another domain is a legitimate redirect.
 */
export const redirect = defineType({
  name: 'redirect',
  title: 'Redirects',
  type: 'document',
  fields: [
    defineField({
      name: 'from',
      title: 'Old address',
      type: 'string',
      description:
        'The path that should redirect, starting with a slash, e.g. /old-page/. Must be a path on this site, and must not be a page that still exists.',
      validation: (Rule) =>
        Rule.required().custom(async (value, context) => {
          if (typeof value !== 'string') return true;
          if (!value.startsWith('/')) return 'Start with a slash, e.g. /old-page/.';
          if (/^https?:\/\//.test(value))
            return 'This has to be a path on this site, not a full URL.';
          if (value === '/') return 'The home page cannot redirect to somewhere else.';
          if (/[?#]/.test(value)) {
            return 'Leave off any ? or # part — redirects match the path only.';
          }
          // Asked last: it costs a query, and the checks above are free.
          return pathIsFree(value, context);
        }),
    }),
    defineField({
      name: 'to',
      title: 'New address',
      type: 'string',
      description: 'Where to send it. A path such as /new-page/, or a full URL on another site.',
      validation: (Rule) =>
        Rule.required().custom((value, context) => {
          if (typeof value !== 'string') return true;
          const from = (context.document as { from?: string } | undefined)?.from;
          if (value === from) return 'This redirects to itself.';
          if (value.startsWith('/') || /^https?:\/\//.test(value)) return true;
          return 'Use a path starting with /, or a full http(s) URL.';
        }),
    }),
    defineField({
      name: 'permanent',
      title: 'Permanent (301)',
      type: 'boolean',
      description:
        'On for a page that has moved for good, which is almost always the case — search engines transfer the old page’s standing to the new one. Off gives a temporary 302, for something that will move back.',
      initialValue: true,
    }),
    defineField({
      name: 'active',
      type: 'boolean',
      description: 'Turn off to disable a redirect without deleting it and losing the note.',
      initialValue: true,
    }),
    defineField({
      name: 'note',
      title: 'Why',
      type: 'string',
      description:
        'What this is for, e.g. "old WordPress URL from the 2026 rebuild". Worth writing: in a year nobody will remember, and an unexplained redirect is one nobody dares remove.',
    }),
  ],
  orderings: [{ title: 'Old address', name: 'from', by: [{ field: 'from', direction: 'asc' }] }],
  preview: {
    select: { title: 'from', to: 'to', permanent: 'permanent', active: 'active', note: 'note' },
    prepare(value: Record<string, unknown>) {
      const code = value['permanent'] === false ? '302' : '301';
      const off = value['active'] === false ? ' · OFF' : '';
      const note = typeof value['note'] === 'string' && value['note'] ? ` · ${value['note']}` : '';
      return {
        title: `${value['from']} → ${value['to']}`,
        subtitle: `${code}${off}${note}`,
      };
    },
  },
});
