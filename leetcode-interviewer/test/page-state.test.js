import test from 'node:test';
import assert from 'node:assert/strict';
import { slugFromPath, codeEditorIndex, readSnapshotMessage, MESSAGE_TYPE } from '../src/lib/page-state.js';

test('a problem path gives its slug', () => {
  assert.equal(slugFromPath('/problems/two-sum/description/'), 'two-sum');
  assert.equal(slugFromPath('/problems/two-sum/'), 'two-sum');
});

test('a path that is not a problem gives null', () => {
  assert.equal(slugFromPath('/problemset/'), null);
});

test('the code editor is the one that is not plain text', () => {
  // On 22 Oct 2026, Two Sum had a cpp editor and a plaintext test-case editor.
  assert.equal(codeEditorIndex(['cpp', 'plaintext']), 0);
  assert.equal(codeEditorIndex(['plaintext', 'python3']), 1);
});

test('with no code editor yet, the index is -1', () => {
  assert.equal(codeEditorIndex(['plaintext']), -1);
  assert.equal(codeEditorIndex([]), -1);
});

const snapshot = { type: MESSAGE_TYPE, slug: 'two-sum', language: 'cpp', code: 'class Solution {}' };

test('a snapshot message from the page is read', () => {
  assert.deepEqual(readSnapshotMessage(snapshot), { slug: 'two-sum', language: 'cpp', code: 'class Solution {}' });
});

test('any other window message is ignored', () => {
  assert.equal(readSnapshotMessage({ ...snapshot, type: 'something-else' }), null);
  assert.equal(readSnapshotMessage({ ...snapshot, code: 42 }), null);
  assert.equal(readSnapshotMessage('hello'), null);
  assert.equal(readSnapshotMessage(null), null);
});
