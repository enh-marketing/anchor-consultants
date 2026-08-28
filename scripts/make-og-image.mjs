import sharp from 'sharp';

// 1200x630 Open Graph card: trimmed wordmark centred on the brand navy.
// Replaces the WordPress build's approach of using the raw logo file as
// og:image on every page, which renders letterboxed in most share previews.
const W = 1200, H = 630, NAVY = '#084876';

const logo = await sharp('src/assets/images/brand/logo-anchor.png')
  .resize({ width: 760, fit: 'inside', withoutEnlargement: true })
  .toBuffer();

// The wordmark ships on an opaque white ground, so sit it on a white card
// rather than compositing navy-on-navy.
const card = await sharp({
  create: { width: 820, height: 240, channels: 4, background: '#ffffff' },
})
  .composite([{ input: logo, gravity: 'center' }])
  .png()
  .toBuffer();

await sharp({ create: { width: W, height: H, channels: 4, background: NAVY } })
  .composite([{ input: card, gravity: 'center' }])
  .png({ compressionLevel: 9 })
  .toFile('public/og-default.png');

const { width, height, size } = await sharp('public/og-default.png').metadata();
console.log(`og-default.png  ${width}x${height}  ${Math.round(size / 1024)} KB`);
