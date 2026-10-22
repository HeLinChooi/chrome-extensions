import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const manifest = JSON.parse(await readFile(new URL('../public/manifest.json', import.meta.url), 'utf8'));
const toolkitPath = new URL('../vendor/gptk/google_photos_toolkit.user.js', import.meta.url);

// The Toolkit v3.3.0 release file that was read before it was copied in.
// A different file means someone replaced it without reading it.
const TOOLKIT_SHA256 = '5c59367a0c467c709c82daf45711b2adb3e272cc5a3a669017879166dcc81629';

test('the extension runs only on photos.google.com', () => {
  const matches = manifest.content_scripts.flatMap((script) => script.matches);
  assert.deepEqual(matches, ['https://photos.google.com/*']);
});

test('the extension asks for no permissions', () => {
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
});

test('the scripts run in the page, so gptkApi is reachable from the page', () => {
  assert.equal(manifest.content_scripts[0].world, 'MAIN');
});

test('the shim loads before the Toolkit', () => {
  assert.deepEqual(manifest.content_scripts[0].js, ['shim.js', 'gptk.js']);
});

test('the Toolkit file is the v3.3.0 release that was reviewed', async () => {
  const hash = createHash('sha256').update(await readFile(toolkitPath)).digest('hex');
  assert.equal(hash, TOOLKIT_SHA256);
});

test('the shim gives the Toolkit the two Tampermonkey names it uses', async () => {
  const page = vm.createContext({});
  vm.runInContext('var window = globalThis;', page);
  vm.runInContext(await readFile(new URL('../src/shim.js', import.meta.url), 'utf8'), page);
  assert.equal(vm.runInContext('unsafeWindow === window && typeof GM_registerMenuCommand', page), 'function');
});
