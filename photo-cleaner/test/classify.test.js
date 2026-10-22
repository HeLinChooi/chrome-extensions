import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toBatches, buildUserContent, parseVerdicts } from '../src/lib/classify.js';

test('batches keep the order and put the remainder last', () => {
  assert.deepEqual(toBatches([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('each photo is sent as a numbered label followed by its image', () => {
  const content = buildUserContent([{ mediaType: 'image/jpeg', data: 'AAA' }]);
  assert.deepEqual(content.slice(0, 2), [
    { type: 'text', text: 'Photo 0:' },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAA' } },
  ]);
});

test('verdicts come back in input order whatever order Claude used', () => {
  const text = JSON.stringify({ photos: [
    { index: 1, verdict: 'delete', reason: 'blurred' },
    { index: 0, verdict: 'keep', reason: 'family dinner' },
  ] });
  assert.deepEqual(parseVerdicts(text, 2).map((v) => v.verdict), ['keep', 'delete']);
});

test('a photo Claude skipped is kept', () => {
  const text = JSON.stringify({ photos: [{ index: 0, verdict: 'delete', reason: 'blurred' }] });
  assert.deepEqual(parseVerdicts(text, 2)[1], { verdict: 'keep', reason: 'no answer from Claude', better: -1 });
});

test('an unknown verdict is treated as keep', () => {
  const text = JSON.stringify({ photos: [{ index: 0, verdict: 'maybe', reason: '?' }] });
  assert.equal(parseVerdicts(text, 1)[0].verdict, 'keep');
});

test('the photo kept instead is passed through', () => {
  const text = JSON.stringify({ photos: [{ index: 1, verdict: 'delete', reason: 'near-copy', better: 0 }] });
  assert.equal(parseVerdicts(text, 2)[1].better, 0);
});

test('a photo kept instead that does not exist in the batch becomes -1', () => {
  const text = JSON.stringify({ photos: [{ index: 1, verdict: 'delete', reason: 'near-copy', better: 7 }] });
  assert.equal(parseVerdicts(text, 2)[1].better, -1);
});

test('a photo cannot be kept instead of itself', () => {
  const text = JSON.stringify({ photos: [{ index: 1, verdict: 'delete', reason: 'near-copy', better: 1 }] });
  assert.equal(parseVerdicts(text, 2)[1].better, -1);
});
