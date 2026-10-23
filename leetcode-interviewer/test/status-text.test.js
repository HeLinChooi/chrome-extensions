import test from 'node:test';
import assert from 'node:assert/strict';
import { statusText } from '../src/lib/status-text.js';

const interview = { slug: 'swim-in-rising-water', title: 'Swim in Rising Water' };

test('no text when no interview is running', () => {
  assert.equal(statusText({ state: 'stopped' }, 'two-sum'), '');
});

test('the tab with the interview shows that it is listening', () => {
  assert.equal(statusText({ state: 'listening', ...interview }, 'swim-in-rising-water'), 'Listening');
});

test('the tab with the interview shows when the interviewer is thinking', () => {
  assert.equal(statusText({ state: 'thinking', ...interview }, 'swim-in-rising-water'), 'Interviewer is thinking…');
});

test('another problem tab names the problem the interview is on', () => {
  assert.equal(statusText({ state: 'listening', ...interview }, 'two-sum'), 'Interview running on Swim in Rising Water');
});

test('a tab that is not a problem names the problem the interview is on', () => {
  assert.equal(statusText({ state: 'thinking', ...interview }, null), 'Interview running on Swim in Rising Water');
});
