/**
 * One-off import of the markdown content in `src/content/` into Sanity,
 * including the local images each entry references.
 *
 * Preferred, because it needs no token of its own — it borrows the one the
 * Sanity CLI already holds for whoever is logged in:
 *
 *   cd studio && npx sanity exec ../scripts/migrate-to-sanity.mjs --with-user-token
 *   cd studio && npx sanity exec ../scripts/migrate-to-sanity.mjs --with-user-token -- --dry-run
 *
 * Or standalone, with a token you create at sanity.io/manage (Editor is enough):
 *
 *   SANITY_WRITE_TOKEN=... node scripts/migrate-to-sanity.mjs --dry-run
 *
 * A token is never read from a file in this repository and must not be
 * committed.
 *
 * Safe to re-run: documents are matched on their slug and patched rather than
 * duplicated, and an image already uploaded is reused by its filename.
 *
 * Body copy is converted to Portable Text blocks. The markdown here is plain
 * paragraphs, so a paragraph-per-block conversion is faithful; anything richer
 * would need @portabletext/block-tools.
 */
import { createClient } from '@sanity/client';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync, createReadStream } from 'node:fs';
import { join, resolve, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = process.env.SANITY_PROJECT_ID ?? 'ld89i91d';
const DATASET = process.env.SANITY_DATASET ?? 'production';
/** Set by run(); the helpers below read it. */
let dryRun = process.argv.includes('--dry-run');

/**
 * The client is injected rather than built here when the import runs through
 * the Studio wrapper (`studio/scripts/import-from-markdown.mjs`), which borrows
 * the token the Sanity CLI already holds. Nobody has to create or paste a
 * credential for that path. Running this file directly falls back to
 * SANITY_WRITE_TOKEN.
 */
function clientFromToken() {
  const token = process.env.SANITY_WRITE_TOKEN ?? process.env.SANITY_AUTH_TOKEN;
  if (!token && !dryRun) {
    console.error(
      'No write token available.\n\n' +
        'Either borrow the CLI login:\n' +
        '  cd studio && npx sanity exec scripts/import-from-markdown.mjs --with-user-token\n\n' +
        'or supply your own:\n' +
        '  SANITY_WRITE_TOKEN=... node scripts/migrate-to-sanity.mjs',
    );
    process.exit(1);
  }
  return createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: '2024-10-01',
    token,
    useCdn: false,
  });
}

let client;

// Resolved from this file, not the working directory: `sanity exec` runs with
// studio/ as cwd, and the content lives at the repository root.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src/content');
const ASSETS = join(ROOT, 'src/assets');

/**
 * Minimal YAML frontmatter reader, sufficient for the flat frontmatter in this
 * repository: scalars, block scalars, one level of nesting, and string lists.
 * A key with no inline value looks ahead to decide whether it opens a list or
 * an object, which is the only genuinely ambiguous case.
 */
function parseFrontmatter(raw) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!m) return { data: {}, body: raw.trim() };
  const [, head, body] = m;
  const lines = head.split(/\r?\n/);
  const data = {};
  // Each frame owns one object and remembers the list currently being filled.
  const stack = [{ indent: -1, obj: data, listKey: null }];

  const indentOf = (l) => l.length - l.trimStart().length;
  const nextMeaningful = (from) => {
    for (let j = from + 1; j < lines.length; j++) {
      if (lines[j].trim() && !lines[j].trim().startsWith('#')) return lines[j];
    }
    return null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const indent = indentOf(line);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const frame = stack[stack.length - 1];

    if (line.trim().startsWith('- ')) {
      if (!frame.listKey) continue;
      const item = line.trim().slice(2);
      const inline = /^([\w-]+):\s*(.*)$/.exec(item);
      if (inline) {
        // A list of objects, e.g. the service feature cards. Subsequent lines
        // indented under this dash belong to the same object.
        const obj = { [inline[1]]: unquote(inline[2]) };
        frame.obj[frame.listKey].push(obj);
        const dashIndent = indent + 2;
        while (
          i + 1 < lines.length &&
          lines[i + 1].trim() &&
          indentOf(lines[i + 1]) >= dashIndent
        ) {
          const nxt = lines[i + 1].trim();
          if (nxt.startsWith('- ')) break;
          const kv2 = /^([\w-]+):\s*(.*)$/.exec(nxt);
          if (!kv2) break;
          obj[kv2[1]] = unquote(kv2[2]);
          i++;
        }
      } else {
        frame.obj[frame.listKey].push(unquote(item));
      }
      continue;
    }

    const kv = /^\s*([\w-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, rest] = kv;
    frame.listKey = null;

    if (rest === '>-' || rest === '>' || rest === '|' || rest === '|-') {
      const parts = [];
      while (i + 1 < lines.length && lines[i + 1].trim() && indentOf(lines[i + 1]) > indent) {
        parts.push(lines[++i].trim());
      }
      frame.obj[key] = parts.join(' ');
      continue;
    }

    if (rest === '') {
      const peek = nextMeaningful(i);
      if (peek && indentOf(peek) > indent && peek.trim().startsWith('- ')) {
        frame.obj[key] = [];
        frame.listKey = key;
      } else {
        frame.obj[key] = {};
        stack.push({ indent, obj: frame.obj[key], listKey: null });
      }
      continue;
    }

    frame.obj[key] = unquote(rest);
  }
  return { data, body: (body ?? '').trim() };
}

function unquote(v) {
  const s = v.trim();
  if (/^'.*'$/.test(s) || /^".*"$/.test(s)) return s.slice(1, -1);
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

/**
 * One paragraph's inline markdown to Portable Text spans.
 *
 * Only `**strong**` and `*em*` are handled, because those are the only inline
 * marks the migrated content uses. The team bio emphasises four phrases, and
 * those are editorial emphasis rather than styling, so they have to survive the
 * move as marks and not as literal asterisks.
 *
 * Anything else — links, code, images inside a paragraph — is left as plain
 * text on purpose. Silently half-converting a syntax is worse than not
 * claiming to support it; add it here when content actually needs it.
 */
function toSpans(text, blockKey) {
  const spans = [];
  const pattern = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let match;
  const push = (value, marks) => {
    if (!value) return;
    spans.push({
      _type: 'span',
      _key: `${blockKey}s${spans.length}`,
      text: value,
      marks,
    });
  };

  while ((match = pattern.exec(text)) !== null) {
    push(text.slice(last, match.index), []);
    push(match[1] ?? match[2], [match[1] ? 'strong' : 'em']);
    last = match.index + match[0].length;
  }
  push(text.slice(last), []);

  // A paragraph is never allowed to become an empty block.
  return spans.length ? spans : [{ _type: 'span', _key: `${blockKey}s0`, text, marks: [] }];
}

/** Paragraphs to Portable Text blocks. */
function toPortableText(markdown) {
  if (!markdown) return undefined;
  return markdown
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map((text, i) => ({
      _type: 'block',
      _key: `b${i}`,
      style: 'normal',
      markDefs: [],
      children: toSpans(text, `b${i}`),
    }));
}

const uploaded = new Map();

/** Uploads a local image once and returns a Sanity image object. */
async function uploadImage(relPath, alt = '', decorative = false) {
  if (!relPath) return undefined;
  // Frontmatter paths are relative to the entry, e.g. ../../assets/images/x.jpg
  const file = resolve(ASSETS, relPath.replace(/^(\.\.\/)+assets\//, ''));
  if (!existsSync(file)) {
    console.warn(`  ! missing image, skipped: ${relPath}`);
    return undefined;
  }
  const name = basename(file);
  if (!uploaded.has(name)) {
    if (dryRun) {
      uploaded.set(name, { _id: `image-DRY-${name}` });
      console.log(`  would upload ${name}`);
    } else {
      const asset = await client.assets.upload('image', createReadStream(file), { filename: name });
      uploaded.set(name, asset);
      console.log(`  uploaded ${name}`);
    }
  }
  return {
    _type: 'altImage',
    asset: { _type: 'reference', _ref: uploaded.get(name)._id },
    alt,
    decorative: decorative || !alt,
  };
}

async function entries(dir) {
  const full = join(CONTENT, dir);
  if (!existsSync(full)) return [];
  const files = (await readdir(full)).filter((f) => extname(f) === '.md');
  return Promise.all(
    files.map(async (f) => {
      const { data, body } = parseFrontmatter(await readFile(join(full, f), 'utf8'));
      return { slug: basename(f, '.md'), data, body };
    }),
  );
}

/** Creates or patches a document, matched on its slug so re-runs are safe. */
async function upsert(type, slug, doc) {
  if (dryRun) {
    console.log(`  would upsert ${type}: ${slug}`);
    return;
  }
  const existing = await client.fetch(`*[_type == $type && slug.current == $slug][0]._id`, {
    type,
    slug,
  });
  if (existing) {
    await client.patch(existing).set(doc).commit();
    console.log(`  patched ${type}: ${slug}`);
  } else {
    await client.create({ _type: type, ...doc });
    console.log(`  created ${type}: ${slug}`);
  }
}

/** Types without a slug are matched on the field that identifies them. */
async function upsertBy(type, field, value, doc) {
  if (dryRun) {
    console.log(`  would upsert ${type}: ${value}`);
    return;
  }
  const existing = await client.fetch(`*[_type == $type && ${field} == $value][0]._id`, {
    type,
    value,
  });
  if (existing) {
    await client.patch(existing).set(doc).commit();
    console.log(`  patched ${type}: ${value}`);
  } else {
    await client.create({ _type: type, ...doc });
    console.log(`  created ${type}: ${value}`);
  }
}

/**
 * @param {object} [options]
 * @param {import('@sanity/client').SanityClient} [options.client]
 * @param {boolean} [options.dry]
 * @param {string[]} [options.only] Sections to import. Defaults to all of them.
 *   Images are uploaded fresh on every run and Sanity does not deduplicate
 *   them, so re-importing everything to fix one document would litter the media
 *   library. Naming a section keeps a re-run proportionate to the change.
 */
export async function run({ client: injected, dry, only } = {}) {
  if (dry !== undefined) dryRun = dry;
  client = injected ?? clientFromToken();
  const wanted = only?.length ? new Set(only) : null;
  const skip = (section) => {
    if (!wanted || wanted.has(section)) return false;
    return true;
  };
  console.log(
    `${dryRun ? 'DRY RUN — nothing will be written' : 'Importing'} into ${PROJECT_ID}/${DATASET}` +
      (wanted ? ` — only: ${[...wanted].join(', ')}` : '') +
      '\n',
  );

  if (!skip('services')) {
    console.log('services');
    for (const { slug, data, body } of await entries('services')) {
      const doc = {
        title: data.title,
        slug: { _type: 'slug', current: slug },
        shortTitle: data.shortTitle,
        summary: data.summary,
        icon: await uploadImage(data.icon, '', true),
        heroImage: await uploadImage(data.heroImage, `${data.title} at Anchor Consultants`),
        bannerImage: await uploadImage(data.bannerImage, '', true),
        // Feature cards carry their own icon, so each needs its own upload.
        features: data.features
          ? await Promise.all(
              data.features.map(async (f, i) => ({
                _type: 'serviceFeature',
                _key: `f${i}`,
                title: f.title,
                icon: await uploadImage(f.icon, '', true),
              })),
            )
          : undefined,
        checklist: data.checklist,
        order: data.order ?? 99,
        body: toPortableText(body),
        seo: { _type: 'seo', metaDescription: data.seo?.metaDescription },
      };
      await upsert('service', slug, doc);
    }
  }

  if (!skip('posts')) {
    console.log('\nposts');
    for (const { slug, data, body } of await entries('posts')) {
      const doc = {
        title: data.title,
        slug: { _type: 'slug', current: slug },
        publishedAt: new Date(data.publishedAt).toISOString(),
        ...(data.updatedAt ? { updatedAt: new Date(data.updatedAt).toISOString() } : {}),
        author: data.author ?? 'Anchor Consultants',
        excerpt: data.excerpt,
        coverImage: await uploadImage(data.coverImage, data.coverImageAlt ?? ''),
        category: data.category ?? 'Uncategorized',
        body: toPortableText(body),
        seo: { _type: 'seo', metaDescription: data.seo?.metaDescription },
      };
      await upsert('post', slug, doc);
      if (data.draft === true) {
        console.log(`    note: "${slug}" is drafted in markdown — unpublish it in the Studio too.`);
      }
    }
  }

  if (!skip('faqs')) {
    console.log('\nfaqs');
    for (const { data } of await entries('faqs')) {
      await upsertBy('faq', 'question', data.question, {
        question: data.question,
        answer: data.answer,
        order: data.order ?? 99,
      });
    }
  }

  if (!skip('testimonials')) {
    console.log('\ntestimonials');
    for (const { data } of await entries('testimonials')) {
      await upsertBy('testimonial', 'quote', data.quote, {
        name: data.name,
        location: data.location,
        quote: data.quote,
        order: data.order ?? 99,
      });
    }
  }

  if (!skip('team')) {
    console.log('\nteam');
    for (const { data, body } of await entries('team')) {
      await upsertBy('teamMember', 'name', data.name, {
        name: data.name,
        role: data.role,
        bio: toPortableText(body),
        photo: await uploadImage(data.photo, data.photoAlt ?? data.name),
        order: data.order ?? 99,
      });
    }
  }

  console.log(
    '\nDone.' +
      (dryRun
        ? ' Re-run without --dry-run to write.'
        : '\nNext: set PUBLIC_SANITY_PROJECT_ID in .env and rebuild to read from Sanity.'),
  );
}

// Run only when executed directly; the Studio wrapper imports `run` instead.
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  run().catch((err) => {
    console.error('\nImport failed:', err.message);
    process.exit(1);
  });
}
