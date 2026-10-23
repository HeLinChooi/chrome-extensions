import test from 'node:test';
import assert from 'node:assert/strict';
import { nextEvent } from '../server/lib/turns.js';
import { wavFile } from '../server/lib/wav.js';
import { problemText } from '../server/lib/problem.js';
import { isTrustedRequest } from '../server/lib/origin.js';
import { userContent } from '../server/lib/prompt.js';

const turns = { turnEndMs: 2500, textTurnEndMs: 5000, longSilenceMs: 60000 };

test('a pause after new speech ends the turn', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 2500, textQuietMs: 2500, newSpeech: true, nudged: false }), 'turn-end');
});

test('a short pause is not the end of a turn', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 2000, textQuietMs: 2000, newSpeech: true, nudged: false }), null);
});

// Typing or room noise can keep the microphone loud, so the pause by loudness
// never comes. On 23 Oct 2026 a question waited 43 s for a reply this way.
test('in a noisy room, 5 s with no new text ends the turn', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 0, textQuietMs: 5000, newSpeech: true, nudged: false }), 'turn-end');
});

test('in a noisy room, 4 s with no new text is not yet the end of a turn', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 0, textQuietMs: 4000, newSpeech: true, nudged: false }), null);
});

test('a pause with nothing new said asks nothing', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 30000, textQuietMs: 30000, newSpeech: false, nudged: false }), null);
});

test('a long silence asks once', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 60000, textQuietMs: 60000, newSpeech: false, nudged: false }), 'long-silence');
  assert.equal(nextEvent({ ...turns, silentMs: 90000, textQuietMs: 90000, newSpeech: false, nudged: true }), null);
});

test('a long silence is measured by text, so noise does not hide it', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 0, textQuietMs: 60000, newSpeech: false, nudged: false }), 'long-silence');
});

test('a WAV file is a 44-byte header for 16 kHz mono 16-bit, then the samples', () => {
  const file = wavFile(Buffer.alloc(32000));
  assert.equal(file.length, 44 + 32000);
  assert.equal(file.toString('ascii', 0, 4), 'RIFF');
  assert.equal(file.readUInt32LE(4), 36 + 32000);
  assert.equal(file.toString('ascii', 8, 16), 'WAVEfmt ');
  assert.equal(file.readUInt16LE(22), 1);
  assert.equal(file.readUInt32LE(24), 16000);
  assert.equal(file.readUInt16LE(34), 16);
  assert.equal(file.toString('ascii', 36, 40), 'data');
  assert.equal(file.readUInt32LE(40), 32000);
});

test('problem HTML becomes plain text', () => {
  const html = '<p>Given <code>nums</code>&nbsp;and <em>target</em>, return &lt;indices&gt;.</p>\n\n<ul><li>2 &lt;= n</li></ul>';
  assert.equal(problemText(html), 'Given nums and target, return <indices>.\n\n2 <= n');
});

test('the extension may call the server', () => {
  assert.equal(isTrustedRequest('POST', 'chrome-extension://abcdefghijklmnop'), true);
});

test('a website may not call the server', () => {
  assert.equal(isTrustedRequest('GET', 'https://evil.example'), false);
});

// Chrome sends no Origin on a GET from an extension page with host permission
// (checked in Chromium on 23 Oct 2026), so the panel's EventSource has none.
test('a GET without an Origin is allowed', () => {
  assert.equal(isTrustedRequest('GET', undefined), true);
});

test('a POST without an Origin is refused', () => {
  assert.equal(isTrustedRequest('POST', undefined), false);
});

const session = {
  problem: { title: 'Two Sum', difficulty: 'Easy', text: 'Given nums and target...' },
  transcript: [{ atMs: 65000, text: 'I would use a hash map.' }],
  interviewer: [{ atMs: 70000, text: 'What is the time complexity?' }],
  language: 'python3',
  code: 'class Solution: pass',
  hintsGiven: 1,
};

test('the problem comes first and is the cached block, so the cache survives each new turn', () => {
  const [problem, rest] = userContent(session, 'turn-end', 90000);
  assert.match(problem.text, /^Problem: Two Sum \(Easy\)/);
  assert.deepEqual(problem.cache_control, { type: 'ephemeral' });
  assert.equal(rest.cache_control, undefined);
});

test('the turn shows what was said, by whom and when, then the code and the event', () => {
  const rest = userContent(session, 'turn-end', 90000)[1].text;
  assert.match(rest, /\[1:05\] Candidate: I would use a hash map\./);
  assert.match(rest, /\[1:10\] You: What is the time complexity\?/);
  assert.match(rest, /```python3\nclass Solution: pass\n```/);
  assert.match(rest, /Hints given so far: 1/);
  assert.match(rest, /Elapsed: 1:30/);
  assert.match(rest, /Event: turn-end/);
});
