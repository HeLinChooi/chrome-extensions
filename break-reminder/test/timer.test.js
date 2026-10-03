import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, observe, startOver, snooze, screenMinutes, DEFAULT_SETTINGS } from '../src/lib/timer.js';

const MIN = 60_000;
const settings = DEFAULT_SETTINGS; // 30 min work, 5 min break, repeat every 5 min

/** Feeds one observation per minute and returns the final result. */
function run(state, from, minutes, idle = 'active') {
  let result = { state, remind: false };
  let reminders = 0;
  for (let m = 0; m <= minutes; m++) {
    result = observe(result.state, { now: from + m * MIN, idle }, settings);
    if (result.remind) reminders++;
  }
  return { ...result, reminders };
}

test('the first active observation starts the screen-time clock', () => {
  const { state } = observe(emptyState(), { now: 0, idle: 'active' }, settings);
  assert.equal(state.activeSince, 0);
});

test('no reminder before 30 minutes of screen time', () => {
  const { reminders } = run(emptyState(), 0, 29);
  assert.equal(reminders, 0);
});

test('a reminder at 30 minutes of screen time', () => {
  const { remind, state } = run(emptyState(), 0, 30);
  assert.equal(remind, true);
  assert.equal(screenMinutes(state, 30 * MIN), 30);
});

test('the reminder repeats every 5 minutes until a break is taken', () => {
  const { reminders } = run(emptyState(), 0, 45);
  assert.equal(reminders, 4); // at 30, 35, 40 and 45
});

test('idle for the break length resets the clock', () => {
  const working = run(emptyState(), 0, 20).state;
  const { state } = observe(working, { now: 21 * MIN, idle: 'idle' }, settings);
  assert.equal(state.activeSince, null);
});

test('screen time starts again from zero after an idle break', () => {
  const working = run(emptyState(), 0, 20).state;
  const rested = observe(working, { now: 26 * MIN, idle: 'idle' }, settings).state;
  const { state } = observe(rested, { now: 27 * MIN, idle: 'active' }, settings);
  assert.equal(screenMinutes(state, 27 * MIN), 0);
});

test('a short screen lock does not count as a break', () => {
  const working = run(emptyState(), 0, 20).state;
  const locked = observe(working, { now: 21 * MIN, idle: 'locked' }, settings).state;
  const { state } = observe(locked, { now: 23 * MIN, idle: 'active' }, settings);
  assert.equal(state.activeSince, 0);
});

test('a screen lock as long as the break length counts as a break', () => {
  const working = run(emptyState(), 0, 20).state;
  const locked = observe(working, { now: 21 * MIN, idle: 'locked' }, settings).state;
  const { state } = observe(locked, { now: 26 * MIN, idle: 'active' }, settings);
  assert.equal(state.activeSince, 26 * MIN);
});

test('a gap with no observations as long as the break counts as a break', () => {
  // The Mac slept or Chrome was closed, so nothing was observed.
  const working = run(emptyState(), 0, 20).state;
  const { state } = observe(working, { now: 40 * MIN, idle: 'active' }, settings);
  assert.equal(state.activeSince, 40 * MIN);
});

test('a snooze delays the next reminder', () => {
  const due = run(emptyState(), 0, 30).state;
  const snoozed = snooze(due, 30 * MIN, 10);
  const { reminders } = run(snoozed, 31 * MIN, 8); // minutes 31 to 39
  assert.equal(reminders, 0);
});

test('the reminder comes back when the snooze ends', () => {
  const due = run(emptyState(), 0, 30).state;
  const snoozed = snooze(due, 30 * MIN, 10);
  const { remind, reminders } = run(snoozed, 31 * MIN, 9); // minutes 31 to 40
  assert.deepEqual([remind, reminders], [true, 1]);
});

test('starting over sets screen time back to zero', () => {
  const due = run(emptyState(), 0, 30).state;
  const state = startOver(due, 31 * MIN);
  assert.equal(screenMinutes(state, 31 * MIN), 0);
});

test('screen time is zero while away', () => {
  assert.equal(screenMinutes(emptyState(), 10 * MIN), 0);
});
