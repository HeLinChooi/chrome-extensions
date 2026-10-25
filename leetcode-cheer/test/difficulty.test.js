import test from 'node:test';
import assert from 'node:assert/strict';
import { isDifficultyLabel } from '../src/lib/difficulty.js';

test('the three difficulty words are labels', () => {
  assert.equal(isDifficultyLabel('Easy'), true);
  assert.equal(isDifficultyLabel('Medium'), true);
  assert.equal(isDifficultyLabel('Hard'), true);
});

test('the short form in the problem list is a label', () => {
  assert.equal(isDifficultyLabel('Med.'), true);
});

test('spaces around the word do not matter', () => {
  assert.equal(isDifficultyLabel('  Hard\n'), true);
});

test('a sentence containing the word is not a label', () => {
  assert.equal(isDifficultyLabel('This is a Hard problem'), false);
  assert.equal(isDifficultyLabel('Hardware'), false);
});

test('other casing is not a label, so lowercase text in a statement is left alone', () => {
  assert.equal(isDifficultyLabel('easy'), false);
  assert.equal(isDifficultyLabel('HARD'), false);
});

test('empty text is not a label', () => {
  assert.equal(isDifficultyLabel(''), false);
  assert.equal(isDifficultyLabel(null), false);
});
