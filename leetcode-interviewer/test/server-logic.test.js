import test from 'node:test';
import assert from 'node:assert/strict';
import { nextEvent } from '../server/lib/turns.js';
import { wavFile } from '../server/lib/wav.js';
import { problemText } from '../server/lib/problem.js';
import { isTrustedOrigin } from '../server/lib/origin.js';
import { userContent } from '../server/lib/prompt.js';

const turns = { turnEndMs: 2500, longSilenceMs: 60000 };

test('a pause after new speech ends the turn', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 2500, newSpeech: true, nudged: false }), 'turn-end');
});

test('a short pause is not the end of a turn', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 2000, newSpeech: true, nudged: false }), null);
});

test('a pause with nothing new said asks nothing', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 30000, newSpeech: false, nudged: false }), null);
});

test('a long silence asks once', () => {
  assert.equal(nextEvent({ ...turns, silentMs: 60000, newSpeech: false, nudged: false }), 'long-silence');
  assert.equal(nextEvent({ ...turns, silentMs: 90000, newSpeech: false, nudged: true }), null);
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

test('only the extension may call the server', () => {
  assert.equal(isTrustedOrigin('chrome-extension://abcdefghijklmnop'), true);
  assert.equal(isTrustedOrigin('https://leetcode.com'), false);
  assert.equal(isTrustedOrigin('https://evil.example'), false);
  assert.equal(isTrustedOrigin(undefined), false);
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
