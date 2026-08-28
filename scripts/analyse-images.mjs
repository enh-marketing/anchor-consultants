import sharp from 'sharp';
import { readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src/assets/images';
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);

const rows = [];
for (const f of walk(ROOT)) {
  if (!/\.(png|jpe?g|webp)$/i.test(f)) continue;
  const meta = await sharp(f).metadata();
  const bytes = statSync(f).size;
  let opaque = true;
  if (meta.hasAlpha) {
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += info.channels) {
      if (data[i] < 250) { opaque = false; break; }
    }
  }
  rows.push({
    file: f.replace(ROOT + '/', ''),
    fmt: meta.format, w: meta.width, h: meta.height,
    alpha: !!meta.hasAlpha, usesAlpha: meta.hasAlpha && !opaque,
    kb: Math.round(bytes / 1024),
  });
}
rows.sort((a, b) => b.kb - a.kb);
const waste = rows.filter(r => r.fmt === 'png' && !r.usesAlpha);
console.log('PNGs that carry no real transparency (candidates for JPEG):');
let saved = 0;
for (const r of waste) { console.log(`  ${String(r.kb).padStart(4)} KB  ${r.w}x${r.h}  ${r.file}`); saved += r.kb; }
console.log(`\n  → ${waste.length} files, ${saved} KB currently as PNG`);
console.log('\nGenuine transparency (must stay PNG/WebP):');
for (const r of rows.filter(r => r.usesAlpha)) console.log(`  ${String(r.kb).padStart(4)} KB  ${r.w}x${r.h}  ${r.file}`);
console.log(`\nTOTAL ${rows.length} files, ${rows.reduce((s, r) => s + r.kb, 0)} KB`);
