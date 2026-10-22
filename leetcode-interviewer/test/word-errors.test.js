import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, wordErrors } from '../server/lib/word-errors.js';

test('punctuation and case are ignored', () => {
  assert.deepEqual(normalize('Let me see, OK?'), ['let', 'me', 'see', 'ok']);
});

test('Big O notation reads the way it is spoken', () => {
  assert.deepEqual(normalize('O(n log n)'), ['o', 'of', 'n', 'log', 'n']);
  assert.deepEqual(normalize('O(n^2)'), ['o', 'of', 'n', 'squared']);
  assert.deepEqual(normalize('O(n²)'), ['o', 'of', 'n', 'squared']);
});

test('small numbers in digits match the spoken words', () => {
  assert.deepEqual(normalize('2, 7, 11 and 15'), ['two', 'seven', 'eleven', 'and', 'fifteen']);
});

test('an exact match has no errors', () => {
  const result = wordErrors('use a hash map', 'Use a hash map.');
  assert.equal(result.errors, 0);
  assert.equal(result.rate, 0);
});

test('a wrong word is one substitution', () => {
  const result = wordErrors('use a hash map', 'use a hash mop');
  assert.equal(result.errors, 1);
  assert.deepEqual(result.mistakes, [{ expected: 'map', heard: 'mop' }]);
});

test('a missing word and an extra word each count once', () => {
  const result = wordErrors('move the left pointer', 'move left pointer now');
  assert.equal(result.errors, 2);
  assert.deepEqual(result.mistakes, [
    { expected: 'the', heard: null },
    { expected: null, heard: 'now' },
  ]);
});

test('the rate is errors divided by the reference length', () => {
  assert.equal(wordErrors('a b c d', 'a x c d').rate, 0.25);
});
