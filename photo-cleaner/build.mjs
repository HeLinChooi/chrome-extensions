import { build } from 'esbuild';
import { cp, rm, mkdir } from 'node:fs/promises';

const shared = {
  outdir: 'dist',
  bundle: true,
  target: 'chrome120',
  // MV3 forbids remote code, so everything is bundled. Unminified so it stays readable.
  minify: false,
  logLevel: 'info',
};

// Content scripts cannot be modules, so they are built as plain scripts.
const builds = [
  { ...shared, entryPoints: { background: 'src/background.js', options: 'src/options.js' }, format: 'esm' },
  { ...shared, entryPoints: { cleaner: 'src/cleaner.js', bridge: 'src/bridge.js' }, format: 'iife' },
];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
// The shim and the Toolkit are copied as they are: the Toolkit is already a built release file.
await cp('src/shim.js', 'dist/shim.js');
await cp('vendor/gptk/google_photos_toolkit.user.js', 'dist/gptk.js');
await Promise.all(builds.map((options) => build(options)));
console.log('built dist/');
