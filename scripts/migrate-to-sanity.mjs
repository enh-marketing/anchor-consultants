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
 * Handles `**strong**`, `*em*` and `[text](href)`. Those are the marks the
 * migrated content actually uses: the team bio emphasises four phrases, the
 * About copy bolds its labels, and the 404 body links to two pages. All three
 * are editorial content rather than styling, so they have to survive the move
 * as marks and not as literal punctuation.
 *
 * Links become `markDefs` on the block, which is how Portable Text models them:
 * the span carries the def's key in its marks, and the def carries the href.
 *
 * Anything else is left as plain text on purpose. Silently half-converting a
 * syntax is worse than not claiming to support it.
 */
function toSpans(text, blockKey) {
  const spans = [];
  const markDefs = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let match;

  const push = (value, marks) => {
    if (!value) return;
    spans.push({ _type: 'span', _key: `${blockKey}s${spans.length}`, text: value, marks });
  };

  while ((match = pattern.exec(text)) !== null) {
    push(text.slice(last, match.index), []);

    const [, linkText, href, strong, em] = match;
    if (linkText && href) {
      const key = `${blockKey}l${markDefs.length}`;
      markDefs.push({ _key: key, _type: 'link', href });
      push(linkText, [key]);
    } else if (strong) {
      push(strong, ['strong']);
    } else if (em) {
      push(em, ['em']);
    }
    last = match.index + match[0].length;
  }
  push(text.slice(last), []);

  // A paragraph is never allowed to become an empty block.
  if (!spans.length) push(text, []);
  return { spans, markDefs };
}

/** Paragraphs to Portable Text blocks. */
function toPortableText(markdown) {
  if (!markdown) return undefined;
  return markdown
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .map((text, i) => {
      const { spans, markDefs } = toSpans(text, `b${i}`);
      return {
        _type: 'block',
        _key: `b${i}`,
        style: 'normal',
        markDefs,
        children: spans,
      };
    });
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

  if (!skip('pages')) {
    console.log('\npages');
    await importHomePage();
    await importInnerPages();
  }

  console.log(
    '\nDone.' +
      (dryRun
        ? ' Re-run without --dry-run to write.'
        : '\nNext: set PUBLIC_SANITY_PROJECT_ID in .env and rebuild to read from Sanity.'),
  );
}

/**
 * The home page as a `page` document.
 *
 * The values here are the ones the components ship with, so importing this
 * changes where the home page's content comes from without changing a word of
 * it. That is what makes the result verifiable: the CMS build is compared
 * against the pre-migration build, and any difference is a bug rather than a
 * judgement call.
 *
 * The three photographic backdrops are deliberately left empty. They are
 * decorative theme imagery, the fields exist so they can be changed, and an
 * empty field keeps the local build-optimised asset. The hero backdrop is the
 * page's largest above-the-fold image, so moving it to a third-party CDN by
 * default would trade measured performance for an edit nobody has asked for.
 */
async function importHomePage() {
  const img = (rel, alt, decorative = false) => uploadImage(`../../assets/${rel}`, alt, decorative);

  const sections = [
    {
      _type: 'heroCarousel',
      _key: 's0',
      slides: [
        {
          _key: 'h0',
          eyebrow: 'UAE Mortgage & Real-Estate Finance Specialists',
          title: 'Unlocking Your Financing Potential',
          body: 'We help you compare leading UAE lenders and structure the right financing whether you\u2019re buying, refinancing, building, or unlocking equity.',
          image: await img(
            'images/hero/slide-1.png',
            'Mortgage consultant ready to advise on UAE property finance',
          ),
        },
        {
          _key: 'h1',
          eyebrow: 'Expert Financial Strategy',
          title: 'Unlocking Your Future Wealth',
          body: 'We help clients from around the world find and use the best tools and opportunities to grow their portfolio.',
          image: await img(
            'images/hero/slide-2.png',
            'Financial strategist advising on portfolio growth',
          ),
        },
        {
          _key: 'h2',
          eyebrow: 'Strategic UAE Development',
          title: 'Fueling Your Growth Potential',
          body: 'We help clients from around the world find and use the best tools and opportunities to fund their UAE projects.',
          image: await img(
            'images/hero/slide-3.png',
            'Adviser supporting UAE development project funding',
          ),
        },
      ],
      cta: { label: 'Book a Free Consultation', href: '/contact/' },
    },
    {
      _type: 'serviceHighlightRow',
      _key: 's1',
      label: 'Financing at a glance',
      tiles: [
        {
          _key: 't0',
          title: 'Home Loan',
          body: 'Finance of villas, apartments and even off-plan properties for salaried and self-employed individuals',
          href: '/services/mortgage-solutions/',
          overlay: 'ink',
          image: await img('images/features/tile-1.jpg', '', true),
        },
        {
          _key: 't1',
          title: 'Commercial Finance',
          body: 'Asset backed financing solutions for Self-Employed Individuals, UAE based entities such as SMEs, Large and Mid-Corporates, Trusts, Offshore Companies, etc.',
          href: '/services/commercial-finances/',
          overlay: 'teal',
          image: await img('images/features/tile-2.jpg', '', true),
        },
        {
          _key: 't2',
          title: 'Construction & Developer Finance',
          body: 'Finance against commercial properties, construction and rental backed finance',
          href: '/services/construction-developer-finance/',
          overlay: 'ink',
          image: await img('images/features/tile-3.jpg', '', true),
        },
      ],
    },
    {
      _type: 'aboutSplit',
      _key: 's2',
      eyebrow: 'About Us',
      title: 'Real-World Banking Experience',
      // The shipped copy is one paragraph split by double <br>s. As Portable
      // Text it becomes three real paragraphs, which the component's
      // `.about-body` rule spaces to the same 26px rhythm.
      body: toPortableText(
        [
          '**Anchor Mortgage Consultants UAE-Expert Mortgage Advisory & Home Loans**',
          '**Secure Your Ideal Home Loan & Property Financing in Dubai, Abu Dhabi, and Across the UAE**',
          'Anchor Mortgage Consultants UAE is a **leading mortgage advisory firm** dedicated to helping residents, expatriates, and property investors navigate the UAE mortgage market with confidence. Whether you are buying your first home, investing in commercial property, or looking to refinance your existing mortgage, our expert consultants provide **tailored mortgage solutions** that meet your financial goals.',
        ].join('\n\n'),
      ),
      cta: { label: 'Discover More', href: '/about/' },
      images: [
        await img(
          'images/about/split-2.jpg',
          'Anchor advisers discussing mortgage options with a client',
        ),
        await img(
          'images/about/split-1.jpg',
          'Client reviewing property financing paperwork with an adviser',
        ),
      ],
    },
    {
      _type: 'servicesCarousel',
      _key: 's3',
      eyebrow: 'Services',
      title: 'What We Offer for You',
      trackLabel: 'What we offer',
      cardCtaLabel: 'Services Details',
      cardCtaHref: '/services/',
    },
    { _type: 'emiCalculator', _key: 's4', title: 'Calculate Your Financing Path' },
    {
      _type: 'leaderProfile',
      _key: 's5',
      title: 'Our Leader',
      ctaHeading: 'You can request an appointment to discuss your financing options.',
      actions: [
        { _key: 'a0', label: 'Get An Appointment', dialog: 'contact-dialog' },
        { _key: 'a1', label: 'Apply For Job', dialog: 'cv-dialog' },
      ],
    },
    {
      _type: 'faqAccordion',
      _key: 's6',
      eyebrow: "FAQ's",
      title: 'Some Questions & A.',
      footerText: 'If you have more questions',
      footerLink: { label: 'Contact Us', href: '/contact/' },
    },
    { _type: 'testimonialCarousel', _key: 's7', eyebrow: 'Testimonials', title: 'User Feedback' },
  ];

  await upsert('page', '/', {
    title: 'Home',
    slug: { _type: 'slug', current: '/' },
    sections,
    seo: {
      _type: 'seo',
      metaDescription:
        'UAE mortgage and real-estate finance specialists. We compare leading UAE lenders and structure the right financing for buying, refinancing or building.',
    },
  });
}

/**
 * The six inner pages as `page` documents.
 *
 * Same principle as the home page: the values are the ones the components ship
 * with, so importing changes where the content comes from without changing a
 * word of it, and the result can be diffed against the pre-migration build.
 *
 * Five pages, not six. The privacy policy is deliberately not imported: its
 * prose interpolates the live contact email, phone and address from Site
 * Settings, and moving that text into a CMS body would freeze those values at
 * whatever they are today. It is also a holding page waiting on legal text, so
 * there is nothing to gain from importing placeholder copy. The route already
 * reads a `page` document if one is ever created, so this is a decision that
 * can be reversed by creating the document in the Studio.
 *
 * The 404 keeps its `noindex` in code. An editable 404 that could be made
 * indexable would be a real SEO problem.
 */
async function importInnerPages() {
  const img = (rel, alt, decorative = false) => uploadImage(`../../assets/${rel}`, alt, decorative);

  const banner = async (rel) => img(rel, '', true);

  const pages = [
    {
      slug: '/about/',
      title: 'About',
      description:
        'Anchor Consultants is a UAE mortgage and property finance advisory built on deep banking experience, with access to multiple lenders across the Emirates.',
      sections: [
        {
          _type: 'pageBanner',
          _key: 'b',
          title: 'Who We Are',
          crumb: 'About',
          image: await banner('images/banners/about.jpg'),
        },
        {
          _type: 'aboutIntro',
          _key: 's0',
          eyebrow: 'About Us',
          title: 'The Region\u2019s Leading Business & Finance Consultancy',
          body: 'The Region\u2019s Leading Business & Finance Consultancy With a foundation built on integrity and deep market insights, we bridge the gap between complex financial challenges and successful outcomes. We specialize in navigating the intricate landscapes of UAE real estate and global finance, ensuring our clients achieve sustainable wealth.',
          images: [
            await img(
              'images/about/about-page.jpg',
              'The Anchor Consultants advisory team in discussion',
            ),
            await img(
              'images/about/split-1.jpg',
              'Advisers reviewing property financing options with a client',
            ),
          ],
        },
        {
          _type: 'copyWithImage',
          _key: 's1',
          title: 'Why Choose Anchor Consultants?',
          body: toPortableText(
            [
              '**\u2022 Trusted Mortgage Experts:** Years of experience in UAE banking, mortgage advisory, and property finance.',
              '**\u2022 Access to Multiple Banks:** Compare mortgage offers from all leading UAE banks to find competitive rates.',
              '**\u2022 Tailored Financing Solutions:** Personalized advice for first-time homebuyers, investors, and expats.',
              '**\u2022 Transparent & Efficient Process:** Clear guidance from application to loan approval.',
            ].join('\n\n'),
          ),
          closing: toPortableText(
            [
              'At **Anchor Consultants**, we simplify the complex mortgage process and empower you with the knowledge and support you need to make **confident property financing decisions.**',
              '**Contact us today** to explore the best **mortgage solutions in Dubai, Abu Dhabi, and across the UAE**, and secure your ideal home or investment property with expert guidance.',
            ].join('\n\n'),
          ),
          image: await img(
            'images/about/plan.jpg',
            "Anchor advisers planning a client's financing route",
          ),
        },
      ],
    },
    {
      slug: '/services/',
      title: 'Services',
      description:
        'Mortgage solutions, commercial finance, construction and developer finance, and lease rental discounting for residents and investors in the UAE.',
      sections: [
        {
          _type: 'pageBanner',
          _key: 'b',
          title: 'What We Do',
          crumb: 'Services',
          image: await banner('images/banners/services.jpg'),
        },
        { _type: 'serviceCardGrid', _key: 's0', cardLinkLabel: 'Read More' },
        {
          _type: 'skillsPanel',
          _key: 's1',
          eyebrow: 'Skillset',
          title: 'Strategy is at the Heart of Growth',
          body: 'Our mission is to provide expert financial guidance and a variety of strategic solutions to international and local investors in a professional and supportive atmosphere.',
          skills: [
            { _key: 'k0', label: 'Financial Advisory', value: 92 },
            { _key: 'k1', label: 'Market Analysis', value: 88 },
          ],
          image: await img(
            'images/services/carousel-bg.jpg',
            'Anchor Consultants advisers with a client',
          ),
        },
      ],
    },
    {
      slug: '/testimonials/',
      title: 'Testimonials',
      description:
        'What clients across Dubai say about working with Anchor Consultants on mortgages, refinancing and property finance in the UAE.',
      sections: [
        {
          _type: 'pageBanner',
          _key: 'b',
          title: 'Client Feedback',
          crumb: 'Testimonials',
          image: await banner('images/banners/testimonials.jpg'),
        },
        { _type: 'testimonialGrid', _key: 's0', srHeading: 'What our clients say' },
      ],
    },
    {
      slug: '/blog/',
      title: 'Blog',
      description:
        'News, guidance and market notes from Anchor Consultants on mortgages, refinancing and property finance for buyers and investors in the UAE.',
      sections: [
        {
          _type: 'pageBanner',
          _key: 'b',
          title: 'Blog',
          crumb: 'Blog',
          image: await banner('images/banners/generic-2.jpg'),
        },
        {
          _type: 'blogIndex',
          _key: 's0',
          emptyBody: 'There are no posts yet. Please check back soon, or',
          emptyCta: { label: 'get in touch', href: '/contact/' },
        },
      ],
    },
    {
      slug: '/404/',
      title: 'Page not found',
      description:
        'The page you were looking for could not be found. Browse our UAE mortgage and property finance services, or get in touch and we will help.',
      sections: [
        {
          _type: 'pageBanner',
          _key: 'b',
          title: 'Not Found',
          crumb: 'Not Found',
          image: await banner('images/banners/generic-1.jpg'),
        },
        {
          _type: 'errorPanel',
          _key: 's0',
          code: '404',
          heading: 'We couldn\u2019t find that page.',
          body: toPortableText(
            'The link may be out of date, or the page may have moved. Try our [services](/services/) pages, or [get in touch](/contact/) and we will point you the right way.',
          ),
          cta: { label: 'Back to Home', href: '/' },
        },
      ],
    },
  ];

  for (const page of pages) {
    await upsert('page', page.slug, {
      title: page.title,
      slug: { _type: 'slug', current: page.slug },
      sections: page.sections,
      seo: { _type: 'seo', metaDescription: page.description },
    });
  }
}

// Run only when executed directly; the Studio wrapper imports `run` instead.
if (process.argv[1] && import.meta.url.endsWith(basename(process.argv[1]))) {
  run().catch((err) => {
    console.error('\nImport failed:', err.message);
    process.exit(1);
  });
}
