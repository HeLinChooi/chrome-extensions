import { build, context } from 'esbuild';
import { cp, rm, mkdir } from 'node:fs/promises';

const watch = process.argv.includes('--watch');

const options = {
  entryPoints: { background: 'src/background.js', popup: 'src/ui/popup.js' },
  outdir: 'dist',
  bundle: true,
  format: 'esm',
  target: 'chrome120',
  // MV3 forbids remote code, so everything is bundled. Unminified so it stays readable.
  minify: false,
  sourcemap: watch ? 'inline' : false,
  logLevel: 'info',
};

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });

if (watch) {
  await (await context(options)).watch();
  console.log('watching…');
} else {
  await build(options);
  console.log('built dist/');
}
