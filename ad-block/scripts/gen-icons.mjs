/**
 * Generates the extension icons with no external tooling: a teal shield on a
 * transparent background.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

// The left half is lighter than the right, so the shield shows on light and dark toolbars.
const LIGHT = [6, 182, 212];
const DARK = [14, 116, 144];
// Each pixel is sampled on a 4×4 grid, and the share of samples inside the
// shield becomes its opacity. This smooths the curved edges at 16 px.
const SAMPLES = 4;

function render(size) {
  const buf = Buffer.alloc(size * size * 4);

  // The shield: a top edge that dips in the middle, straight sides, and
  // sides that curve in to a point at the bottom.
  const [left, right, top, dip, waist, tip] = [0.1, 0.9, 0.06, 0.06, 0.42, 0.97].map((v) => v * size);
  const centre = size / 2;
  const halfWidth = (right - left) / 2;
  const onShield = (x, y) => {
    const across = (x - centre) / halfWidth; // -1 at the left edge, 1 at the right
    if (Math.abs(across) > 1 || y > tip) return false;
    if (y < top + dip * (1 - across * across)) return false;
    if (y <= waist) return true;
    // Below the waist, the half-width follows a quarter cosine. It reaches zero
    // at the tip with a slope, which makes a point rather than a round bottom.
    const t = (y - waist) / (tip - waist);
    return Math.abs(x - centre) <= halfWidth * Math.cos((t * Math.PI) / 2);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = 0;
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          if (onShield(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES)) inside++;
        }
      }
      const colour = x + 0.5 < centre ? LIGHT : DARK;
      const i = (y * size + x) * 4;
      buf[i] = colour[0];
      buf[i + 1] = colour[1];
      buf[i + 2] = colour[2];
      buf[i + 3] = Math.round((inside / (SAMPLES * SAMPLES)) * 255);
    }
  }
  return buf;
}

function png(rgba, size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter type: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }

  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}

mkdirSync('public/icons', { recursive: true });
for (const size of [16, 32, 48, 128]) {
  writeFileSync(`public/icons/icon${size}.png`, png(render(size), size));
  console.log(`public/icons/icon${size}.png`);
}
