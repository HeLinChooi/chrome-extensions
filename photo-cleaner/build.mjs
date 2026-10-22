import { cp, rm, mkdir } from 'node:fs/promises';

// Nothing needs bundling yet: the shim is plain JavaScript and the Toolkit is
// already a built release file. esbuild comes in with our own cleaner code.
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
await cp('src/shim.js', 'dist/shim.js');
await cp('vendor/gptk/google_photos_toolkit.user.js', 'dist/gptk.js');
console.log('built dist/');
