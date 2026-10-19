import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSnapshot, snapshotFilename, localDate } from '../src/lib/snapshot.js';

const at = new Date(2026, 9, 19, 22, 15, 0); // 19 Oct 2026, 22:15 local

test('localDate uses the local calendar day, not UTC', () => {
  // 00:30 local is still the previous day in UTC for any zone east of UTC.
  assert.equal(localDate(new Date(2026, 9, 20, 0, 30)), '2026-10-20');
  assert.equal(localDate(new Date(2026, 0, 5, 9, 0)), '2026-01-05');
});

test('snapshotFilename is one file per day under tab-triage/', () => {
  assert.equal(snapshotFilename(at), 'tab-triage/2026-10-19.json');
});

test('buildSnapshot keeps only title and url', () => {
  const snap = buildSnapshot([
    { id: 7, url: 'https://jobs.wise.com/1', title: 'Senior SWE', pinned: false, lastAccessed: 1 },
  ], at);
  assert.deepEqual(snap.tabs, [{ url: 'https://jobs.wise.com/1', title: 'Senior SWE' }]);
  assert.equal(snap.date, '2026-10-19');
  assert.equal(snap.version, 1);
  assert.equal(snap.takenAt, at.toISOString());
});

test('buildSnapshot drops pinned tabs and browser pages', () => {
  const snap = buildSnapshot([
    { url: 'https://mail.google.com/', title: 'Inbox', pinned: true },
    { url: 'chrome://extensions/', title: 'Extensions', pinned: false },
    { url: 'chrome-extension://abc/dashboard.html', title: 'Tab Triage', pinned: false },
    { url: 'https://leetcode.com/problems/x/', title: 'X', pinned: false },
  ], at);
  assert.deepEqual(snap.tabs.map((t) => t.title), ['X']);
});

test('buildSnapshot falls back to pendingUrl and an untitled label', () => {
  const snap = buildSnapshot([{ pendingUrl: 'https://a.com/', pinned: false }], at);
  assert.deepEqual(snap.tabs, [{ url: 'https://a.com/', title: '(untitled)' }]);
});

test('buildSnapshot drops tabs with no url at all', () => {
  assert.deepEqual(buildSnapshot([{ title: 'blank', pinned: false }], at).tabs, []);
});

test('buildSnapshot matches the sample file the coach reads', async () => {
  // projects/coach/tests reads this same file. A field renamed here fails
  // this test; update the coach's `coach tabs` and the fixture together.
  const { readFile } = await import('node:fs/promises');
  const sample = JSON.parse(await readFile(new URL('./fixtures/snapshot-v1.json', import.meta.url)));
  const snap = buildSnapshot([
    { url: 'https://jobs.wise.com/1', title: 'Senior SWE', pinned: false },
    { url: 'https://mail.google.com/', title: 'Inbox', pinned: true },
    { url: 'https://leetcode.com/problems/divide-two-integers/', title: '29. Divide Two Integers', pinned: false },
  ], new Date(sample.takenAt));
  assert.deepEqual({ ...snap, date: sample.date }, sample);
});
