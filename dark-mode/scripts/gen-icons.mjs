/**
 * Generates the extension icons with no external tooling: a dark rounded
 * square with a pale crescent moon.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [30, 27, 46];
const FG = [250, 204, 21];

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const radius = size * 0.22;
  const inCorner = (x, y) => {
    const cx = Math.min(Math.max(x, radius), size - radius);
    const cy = Math.min(Math.max(y, radius), size - radius);
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2;
  };

  // The moon: a disc with a second, offset disc cut out of it.
  const moon = [size * 0.5, size * 0.5, size * 0.32];
  const bite = [size * 0.64, size * 0.38, size * 0.27];
  const inside = (p, [cx, cy, r]) => (p[0] - cx) ** 2 + (p[1] - cy) ** 2 <= r * r;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const p = [x + 0.5, y + 0.5];
      if (!inCorner(...p)) continue;
      const onMoon = inside(p, moon) && !inside(p, bite);
      const colour = onMoon ? FG : BG;
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
