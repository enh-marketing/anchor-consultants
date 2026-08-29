/**
 * Static server for `dist/client` with gzip and production-like caching.
 *
 * `astro preview` serves everything uncompressed, which makes Lighthouse
 * report render-blocking CSS and document latency that no real deployment
 * would have — a 44 KB stylesheet is 9 KB over the wire. Every target host
 * (Vercel, Netlify, Cloudflare, nginx) compresses by default, so measuring
 * against the raw preview server overstates the problem.
 *
 * QA only. Not part of the build or the deployment.
 *
 *   node scripts/serve-compressed.mjs [port]
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream';

const ROOT = 'dist/client';
const PORT = Number(process.argv[2] ?? 4330);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

/** Text formats are worth compressing; images and fonts already are. */
const COMPRESSIBLE = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt']);

function resolve(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(ROOT, clean);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

createServer((req, res) => {
  const file = resolve(req.url ?? '/') ?? join(ROOT, '404.html');
  const found = resolve(req.url ?? '/') !== null;
  const ext = extname(file);

  const headers = {
    'Content-Type': TYPES[ext] ?? 'application/octet-stream',
    // Hashed assets are immutable; HTML must revalidate.
    'Cache-Control': file.includes('/_astro/')
      ? 'public, max-age=31536000, immutable'
      : 'public, max-age=0, must-revalidate',
  };

  const acceptsGzip = /\bgzip\b/.test(req.headers['accept-encoding'] ?? '');
  const stream = createReadStream(file);

  if (acceptsGzip && COMPRESSIBLE.has(ext)) {
    headers['Content-Encoding'] = 'gzip';
    headers['Vary'] = 'Accept-Encoding';
    res.writeHead(found ? 200 : 404, headers);
    pipeline(stream, createGzip({ level: 9 }), res, () => {});
  } else {
    headers['Content-Length'] = String(statSync(file).size);
    res.writeHead(found ? 200 : 404, headers);
    pipeline(stream, res, () => {});
  }
}).listen(PORT, () => {
  console.log(`Serving ${ROOT} with gzip at http://localhost:${PORT}`);
});
