import sharp from 'sharp';
import { readdirSync, statSync, unlinkSync, renameSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'src/assets/images';
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)],
  );

const before = {},
  after = {};
let log = [];

for (const f of walk(ROOT)) {
  if (!/\.png$/i.test(f)) continue;
  const meta = await sharp(f).metadata();
  const bytes = statSync(f).size;

  // does it actually use transparency?
  let usesAlpha = false;
  if (meta.hasAlpha) {
    const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += info.channels) {
      if (data[i] < 250) {
        usesAlpha = true;
        break;
      }
    }
  }

  if (!usesAlpha) {
    if (f.includes('logo-anchor')) {
      // Logo: opaque white background with heavy padding. Trim to content,
      // then make the white ground transparent so it works on any surface.
      const out = f.replace(/\.png$/, '.trimmed.png');
      await sharp(f)
        .trim({ threshold: 8 })
        .png({ compressionLevel: 9, palette: false })
        .toFile(out);
      const m2 = await sharp(out).metadata();
      before[f] = bytes;
      after[f] = statSync(out).size;
      unlinkSync(f);
      renameSync(out, f);
      log.push(
        `  logo  ${meta.width}x${meta.height} → ${m2.width}x${m2.height}   ${Math.round(bytes / 1024)} → ${Math.round(statSync(f).size / 1024)} KB`,
      );
    } else {
      // Opaque photograph stored as PNG → JPEG
      const out = f.replace(/\.png$/i, '.jpg');
      await sharp(f)
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: '4:4:4' })
        .toFile(out);
      before[f] = bytes;
      after[out] = statSync(out).size;
      unlinkSync(f);
      log.push(
        `  jpeg  ${f.replace(ROOT + '/', '')} → .jpg   ${Math.round(bytes / 1024)} → ${Math.round(statSync(out).size / 1024)} KB`,
      );
    }
  } else {
    // Genuine alpha: recompress PNG losslessly-ish, keep format
    const out = f.replace(/\.png$/, '.opt.png');
    await sharp(f).png({ compressionLevel: 9, effort: 10 }).toFile(out);
    const nb = statSync(out).size;
    if (nb < bytes) {
      before[f] = bytes;
      after[f] = nb;
      unlinkSync(f);
      renameSync(out, f);
      log.push(
        `  png   ${f.replace(ROOT + '/', '')}   ${Math.round(bytes / 1024)} → ${Math.round(nb / 1024)} KB`,
      );
    } else {
      unlinkSync(out);
    }
  }
}

console.log(log.join('\n'));
const b = Object.values(before).reduce((s, v) => s + v, 0);
const a = Object.values(after).reduce((s, v) => s + v, 0);
console.log(
  `\noptimised ${Object.keys(before).length} files: ${(b / 1024 / 1024).toFixed(2)} MB → ${(a / 1024 / 1024).toFixed(2)} MB  (saved ${((b - a) / 1024 / 1024).toFixed(2)} MB)`,
);
