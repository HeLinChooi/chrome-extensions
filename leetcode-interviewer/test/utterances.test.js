import test from 'node:test';
import assert from 'node:assert/strict';
import { createSplitter, frameLoudness } from '../server/lib/utterances.js';

// 30 ms frames. Loudness 1000 is speech and 100 is background, as measured
// in Coin's recording on 22 Oct 2026.
const SPEECH = 1000;
const QUIET = 100;
const options = { threshold: 400, frameMs: 30, minSpeechMs: 90, endSilenceMs: 300, maxUtteranceMs: 3000 };

function run(levels) {
  const splitter = createSplitter(options);
  return levels.map((level) => splitter.push(level)).filter(Boolean);
}

const frames = (level, count) => Array(count).fill(level);

test('speech followed by enough silence is one utterance', () => {
  const found = run([...frames(QUIET, 5), ...frames(SPEECH, 20), ...frames(QUIET, 10)]);
  assert.deepEqual(found, [{ start: 5, end: 25 }]);
});

test('a pause shorter than the end silence stays inside the utterance', () => {
  const found = run([...frames(SPEECH, 10), ...frames(QUIET, 5), ...frames(SPEECH, 10), ...frames(QUIET, 10)]);
  assert.deepEqual(found, [{ start: 0, end: 25 }]);
});

test('a click shorter than the minimum speech is ignored', () => {
  assert.deepEqual(run([...frames(SPEECH, 2), ...frames(QUIET, 20)]), []);
});

test('speech with no ending yet gives nothing', () => {
  assert.deepEqual(run(frames(SPEECH, 50)), []);
});

test('a long utterance is cut at the maximum length and continues', () => {
  // 3000 ms is 100 frames.
  const found = run([...frames(SPEECH, 150), ...frames(QUIET, 10)]);
  assert.deepEqual(found, [{ start: 0, end: 100 }, { start: 100, end: 150 }]);
});

test('the splitter reports how long it has been silent', () => {
  const splitter = createSplitter(options);
  for (const level of [...frames(SPEECH, 10), ...frames(QUIET, 40)]) splitter.push(level);
  assert.equal(splitter.silentMs(), 1200);
});

test('loudness is the root mean square of 16-bit samples', () => {
  const samples = Buffer.alloc(8);
  [300, -300, 400, -400].forEach((value, i) => samples.writeInt16LE(value, i * 2));
  assert.equal(frameLoudness(samples), Math.sqrt((300 ** 2 * 2 + 400 ** 2 * 2) / 4));
});
