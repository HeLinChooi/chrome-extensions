import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyState,
  recordAccepted,
  recordFailure,
  currentStreak,
  solvedToday,
  dayKey,
} from '../src/lib/progress.js';

// Tests run with TZ=UTC (see package.json), so these are midday on each date.
const day = (d, hour = 12) => Date.UTC(2026, 9, d, hour);

const solve = (state, slug, at, difficulty = 'Medium') =>
  recordAccepted(state, { slug, title: slug, difficulty, at });

test('a new Medium solved first try earns 25 x 1.5 = 38 XP', () => {
  const { reward } = solve(emptyState(), 'two-sum', day(2));
  assert.equal(reward.xpGained, 38);
  assert.equal(reward.kind, 'new');
  assert.equal(reward.firstTry, true);
});

test('a failed submission earlier today removes the first-try bonus', () => {
  const failed = recordFailure(emptyState(), { slug: 'two-sum', at: day(2, 9) });
  const { reward } = solve(failed, 'two-sum', day(2, 10));
  assert.equal(reward.firstTry, false);
  assert.equal(reward.xpGained, 25);
});

test('a failure on an earlier day does not cost the first-try bonus', () => {
  const failed = recordFailure(emptyState(), { slug: 'two-sum', at: day(1) });
  const { reward } = solve(failed, 'two-sum', day(2));
  assert.equal(reward.firstTry, true);
});

test('Hard is worth more than Easy', () => {
  assert.equal(solve(emptyState(), 'a', day(2), 'Easy').reward.xpGained, 15);
  assert.equal(solve(emptyState(), 'a', day(2), 'Hard').reward.xpGained, 75);
});

test('an unknown difficulty is scored as Medium', () => {
  assert.equal(solve(emptyState(), 'a', day(2), undefined).reward.xpGained, 38);
});

test('solving the same problem again within a week earns nothing', () => {
  const first = solve(emptyState(), 'a', day(2)).state;
  const { reward } = solve(first, 'a', day(4));
  assert.equal(reward.kind, 'repeat');
  assert.equal(reward.xpGained, 0);
});

test('a repeat does not count towards the daily goal', () => {
  const first = solve(emptyState(), 'a', day(2)).state;
  const { state } = solve(first, 'a', day(2, 13));
  assert.equal(solvedToday(state, day(2)), 1);
});

test('solving it again after a week is a review worth half', () => {
  const first = solve(emptyState(), 'a', day(1)).state;
  const { reward } = solve(first, 'a', day(9));
  assert.equal(reward.kind, 'review');
  assert.equal(reward.xpGained, 19);
});

test('solving on consecutive days grows the streak', () => {
  let state = emptyState();
  for (const d of [1, 2, 3]) state = solve(state, `p${d}`, day(d)).state;
  assert.equal(state.streak.count, 3);
});

test('two solves on one day count the day once', () => {
  let state = solve(emptyState(), 'a', day(1)).state;
  state = solve(state, 'b', day(1, 15)).state;
  assert.equal(state.streak.count, 1);
});

test('a missed day restarts the streak at 1', () => {
  let state = solve(emptyState(), 'a', day(1)).state;
  state = solve(state, 'b', day(3)).state;
  assert.equal(state.streak.count, 1);
});

test('the streak still shows on the day after a solve, and is gone the day after that', () => {
  const state = solve(emptyState(), 'a', day(1)).state;
  assert.equal(currentStreak(state, day(2)), 1);
  assert.equal(currentStreak(state, day(3)), 0);
});

test('the goal is reached exactly once, on the solve that meets it', () => {
  let state = emptyState(); // goal is 2
  const first = solve(state, 'a', day(1));
  const second = solve(first.state, 'b', day(1, 13));
  const third = solve(second.state, 'c', day(1, 14));
  assert.deepEqual(
    [first.reward.goalReached, second.reward.goalReached, third.reward.goalReached],
    [false, true, false],
  );
});

test('crossing 100 XP is a level up', () => {
  let state = emptyState();
  state = solve(state, 'a', day(1), 'Hard').state; // 75
  const { reward } = solve(state, 'b', day(1), 'Hard'); // 150
  assert.equal(reward.level, 2);
  assert.equal(reward.levelUp, true);
  assert.equal(reward.xpIntoLevel, 50);
});

test('the day key is the calendar date', () => {
  assert.equal(dayKey(day(2)), '2026-10-02');
});

test('recording a solve does not change the state passed in', () => {
  const before = emptyState();
  solve(before, 'a', day(1));
  assert.deepEqual(before, emptyState());
});
