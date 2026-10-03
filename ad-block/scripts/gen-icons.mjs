/**
 * Generates the extension icons with no external tooling: a teal rounded
 * square with a white shield.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [14, 116, 144];
const FG = [255, 255, 255];

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const inCorner = (x, y) => {
    const cx = Math.min(Math.max(x, radius), size - radius);
    const cy = Math.min(Math.max(y, radius), size - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
  };

  // The shield: straight sides on top, curving to a point at the bottom.
  const [left, right, top, waist, tip] = [0.27, 0.73, 0.22, 0.52, 0.82].map((v) => v * size);
  const onShield = (x, y) => {
    if (y < top || y > tip || x < left || x > right) return false;
    if (y <= waist) return true;
    // Below the waist, the half-width shrinks along a quarter ellipse to zero at the tip.
    const t = (y - waist) / (tip - waist);
    return Math.abs(x - size / 2) <= ((right - left) / 2) * Math.sqrt(1 - t * t);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = [x + 0.5, y + 0.5];
      if (!inCorner(...p)) continue;
      const onIcon = onShield(...p);
      const colour = onIcon ? FG : BG;
      const i = (y * size + x) * 4;
      buf[i] = colour[0];
      buf[i + 1] = colour[1];
      buf[i + 2] = colour[2];
      buf[i + 3] = 255;
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
