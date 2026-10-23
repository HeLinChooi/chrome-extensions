import test from 'node:test';
import assert from 'node:assert/strict';
import { speechText } from '../server/lib/speech-text.js';

// Each of these came from Whisper during silence or noise in Coin's sessions on 23 Oct 2026.
test('a sound label in brackets is not speech', () => {
  assert.equal(speechText('[BLANK_AUDIO]'), '');
});

test('a sound label in asterisks is not speech', () => {
  assert.equal(speechText('*crunch*'), '');
});

test('punctuation alone is not speech', () => {
  assert.equal(speechText('.'), '');
});

test('speech keeps its words, with spaces tidied', () => {
  assert.equal(speechText(' Do BFS\n until the queue is empty. '), 'Do BFS until the queue is empty.');
});

test('a one-word answer is speech', () => {
  assert.equal(speechText('Done.'), 'Done.');
});
