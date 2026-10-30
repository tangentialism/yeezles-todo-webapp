import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';

// Pins the Rising Hash icon set (workspace spec 2026-10-29-logo-and-today-color-design.md §5.1):
// rounded tiles with alpha are "any", full-bleed flattened tiles are "maskable" and apple-touch.

const pub = (p: string) => join(process.cwd(), 'public', p.replace(/^\//, ''));

interface ManifestIcon { src: string; sizes: string; type: string; purpose: string }
const manifest = JSON.parse(readFileSync(pub('manifest.json'), 'utf8')) as {
  background_color: string; theme_color: string; icons: ManifestIcon[];
};
const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');

/** Width, height and color type straight from a PNG's IHDR chunk. */
const ihdr = (p: string) => {
  const buf = readFileSync(pub(p));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
};

/**
 * Channels of pixel (0,0) of an 8-bit PNG (RGB or RGBA). Every PNG row filter
 * predicts the first pixel of the first row from zeros, so its bytes are stored raw.
 */
const cornerPixel = (p: string) => {
  const buf = readFileSync(pub(p));
  const idat: Buffer[] = [];
  for (let off = 8; off < buf.length; off += 12 + buf.readUInt32BE(off)) {
    if (buf.toString('ascii', off + 4, off + 8) === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + buf.readUInt32BE(off)));
  }
  const channels = ihdr(p).colorType === 6 ? 4 : 3;
  return [...inflateSync(Buffer.concat(idat)).subarray(1, 1 + channels)]; // [0] is the row's filter byte
};
const cornerAlpha = (p: string) => cornerPixel(p)[3];

const APPLE_TOUCH = '/icons/apple-touch-icon-180x180.png';

describe('brand icons', () => {
  it('manifest: rounded icons are "any", full-bleed are "maskable"', () => {
    const rounded = manifest.icons.filter((i) => i.src.startsWith('/icons/icon-'));
    expect(rounded.length).toBeGreaterThan(0);
    for (const icon of rounded) expect(icon.purpose).toBe('any');
    const maskable = manifest.icons.filter((i) => i.purpose === 'maskable');
    expect(maskable.map(({ src, sizes }) => ({ src, sizes }))).toEqual([
      { src: '/icons/maskable-192x192.png', sizes: '192x192' },
      { src: '/icons/maskable-512x512.png', sizes: '512x512' },
      // WebKit recommends a 1024px full-bleed icon for Safari's Add to Dock
      { src: '/icons/maskable-1024x1024.png', sizes: '1024x1024' },
    ]);
    expect(manifest.background_color).toBe('#F6F8FA');
    expect(manifest.theme_color).toBe('#F6F8FA');
  });

  // Chrome and Firefox prefer a linked SVG favicon over PNGs, which would hide the
  // pixel-snapped 16px art (David, 2026-10-30: PNGs only).
  it('index.html: PNG favicons only, apple-touch points at the flattened icon', () => {
    const icons = html.match(/<link rel="icon"[^>]*>/g) ?? [];
    expect(icons).toHaveLength(2);
    for (const link of icons) expect(link).toContain('type="image/png"');
    expect(html).not.toContain('favicon.svg');
    expect(existsSync(pub('favicon.svg'))).toBe(false);
    expect(html).toMatch(new RegExp(`<link rel="apple-touch-icon" href="${APPLE_TOUCH}"`));
  });

  it('every icon file exists at its stated size', () => {
    const files: [string, number][] = [
      ...manifest.icons.map((i): [string, number] => [i.src, Number(i.sizes.split('x')[0])]),
      ['/favicon-16.png', 16], ['/favicon-32.png', 32], [APPLE_TOUCH, 180],
    ];
    for (const [src, size] of files) {
      const { width, height } = ihdr(src);
      expect({ src, width, height }).toEqual({ src, width: size, height: size });
    }
  });

  it('apple-touch and maskable icons have no alpha', () => {
    const flat = [APPLE_TOUCH, ...manifest.icons.filter((i) => i.purpose === 'maskable').map((i) => i.src)];
    for (const src of flat) expect({ src, colorType: ihdr(src).colorType }).toEqual({ src, colorType: 2 });
  });

  // The app icon is the mark on white (David, 2026-10-30): the dark tile muddied at dock sizes
  it('apple-touch and maskable icons are white tiles', () => {
    const flat = [APPLE_TOUCH, ...manifest.icons.filter((i) => i.purpose === 'maskable').map((i) => i.src)];
    for (const src of flat) expect({ src, corner: cornerPixel(src) }).toEqual({ src, corner: [255, 255, 255] });
  });

  it('rounded icons keep alpha', () => {
    const rounded = manifest.icons.filter((i) => i.purpose === 'any').map((i) => i.src);
    expect(rounded.length).toBeGreaterThan(0);
    for (const src of rounded) expect({ src, colorType: ihdr(src).colorType }).toEqual({ src, colorType: 6 });
  });

  // Type 6 alone would pass a render whose background came out opaque (white corners).
  it('rounded icons have transparent corners', () => {
    const rounded = [...manifest.icons.filter((i) => i.purpose === 'any').map((i) => i.src), '/favicon-32.png'];
    for (const src of rounded) expect({ src, alpha: cornerAlpha(src) }).toEqual({ src, alpha: 0 });
  });

  it('stale art is gone', () => {
    expect(existsSync(pub('original-icon.png'))).toBe(false);
    expect(existsSync(pub('vite.svg'))).toBe(false);
  });
});
