import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * "Read page text" is a stored setting, but the <all_urls> permission it needs
 * is held by Chrome per extension ID. The two can disagree: a reloaded or moved
 * unpacked extension keeps its copied settings and loses its permissions.
 */
function stubChrome({ granted }) {
  global.chrome = {
    storage: {
      local: {
        get: async (key) => (key === 'settings' ? { settings: { readPageText: true } } : {}),
        set: async () => {},
      },
    },
    tabs: {
      query: async () => [
        { id: 1, url: 'https://example.com/a', title: 'A', status: 'complete' },
        { id: 2, url: 'https://example.com/b', title: 'B', status: 'complete' },
      ],
    },
    permissions: { contains: async () => granted },
    scripting: { executeScript: async () => [{ result: null }] },
  };
}

const { runAnalysis } = await import('../src/lib/digest.js');

test('a missing page permission is named as the cause, not left unexplained', async () => {
  stubChrome({ granted: false });
  const report = await runAnalysis({ persist: false });
  const warning = report.warnings.find((w) => w.includes('could not be read'));
  assert.match(warning, /page access is not granted/i);
  assert.doesNotMatch(warning, /reasons not recorded/);
});

test('a missing page permission tells the user how to grant it', async () => {
  stubChrome({ granted: false });
  const report = await runAnalysis({ persist: false });
  const warning = report.warnings.find((w) => w.includes('could not be read'));
  assert.match(warning, /Settings.*Read page text/);
});

test('the permission warning does not appear when the permission is granted', async () => {
  stubChrome({ granted: true });
  const report = await runAnalysis({ persist: false });
  assert.ok(report.warnings.every((w) => !/page access is not granted/i.test(w)));
});
