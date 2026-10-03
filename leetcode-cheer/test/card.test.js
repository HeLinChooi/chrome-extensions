import test from 'node:test';
import assert from 'node:assert/strict';
import { cardLines } from '../src/lib/card.js';

const reward = (over) => ({
  kind: 'new',
  difficulty: 'Medium',
  firstTry: true,
  xpGained: 38,
  level: 1,
  levelUp: false,
  streak: 3,
  solvedToday: 1,
  goal: 2,
  goalReached: false,
  ...over,
});

test('a first-try solve names the bonus', () => {
  assert.equal(cardLines(reward())[0], '+38 XP · first try ×1.5');
});

test('a level up and a reached goal come first', () => {
  const lines = cardLines(reward({ levelUp: true, level: 4, goalReached: true, solvedToday: 2 }));
  assert.deepEqual(lines.slice(0, 2), ['Level 4!', 'Daily goal reached: 2/2']);
});

test('a repeat says why it earned nothing', () => {
  assert.equal(cardLines(reward({ kind: 'repeat', xpGained: 0 }))[0], 'Solved again. No XP for a repeat within a week.');
});

test('the runtime percentile is shown when LeetCode gives one', () => {
  const lines = cardLines(reward(), { runtimePercentile: 87.456 });
  assert.equal(lines.at(-1), 'Runtime beats 87.5%');
});
