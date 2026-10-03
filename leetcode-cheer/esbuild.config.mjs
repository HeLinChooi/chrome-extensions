import { build, context } from 'esbuild';
import { cp, rm, mkdir } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

const shared = {
  outdir: 'dist',
  bundle: true,
  target: 'chrome120',
  // MV3 forbids remote code, so everything is bundled. Unminified so it stays readable.
  minify: false,
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
};

// Content scripts cannot be ES modules, so they are bundled as plain scripts.
const builds = [
  { ...shared, entryPoints: { interceptor: 'src/interceptor.js', content: 'src/content.js' }, format: 'iife' },
  { ...shared, entryPoints: { popup: 'src/ui/popup.js' }, format: 'esm' },
];

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });

if (watch) {
  for (const options of builds) await (await context(options)).watch();
  console.log('watching…');
} else {
  await Promise.all(builds.map((options) => build(options)));
  console.log('built dist/');
}
