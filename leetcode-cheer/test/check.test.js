import test from 'node:test';
import assert from 'node:assert/strict';
import { submissionIdFromUrl, readVerdict, slugFromPath } from '../src/lib/check.js';

test('a submission check URL gives its id', () => {
  assert.equal(submissionIdFromUrl('https://leetcode.com/submissions/detail/1234567/check/'), '1234567');
});

test('the v2 check URL gives its id', () => {
  assert.equal(submissionIdFromUrl('/submissions/detail/1234567/v2/check/'), '1234567');
});

test('a Run check is not a submission', () => {
  assert.equal(submissionIdFromUrl('/submissions/detail/runcode_1727_abc/check/'), null);
});

test('other LeetCode URLs are not submission checks', () => {
  assert.equal(submissionIdFromUrl('/submissions/detail/1234567/'), null);
  assert.equal(submissionIdFromUrl('/graphql/'), null);
});

test('a pending check has no verdict yet', () => {
  assert.equal(readVerdict({ state: 'PENDING' }), null);
  assert.equal(readVerdict({ state: 'STARTED' }), null);
});

test('status code 10 is accepted', () => {
  const verdict = readVerdict({
    state: 'SUCCESS',
    status_code: 10,
    status_msg: 'Accepted',
    runtime_percentile: 87.5,
    memory_percentile: 40,
  });
  assert.deepEqual(verdict, { accepted: true, status: 'Accepted', runtimePercentile: 87.5, memoryPercentile: 40 });
});

test('a wrong answer is a finished verdict that is not accepted', () => {
  const verdict = readVerdict({ state: 'SUCCESS', status_code: 11, status_msg: 'Wrong Answer' });
  assert.equal(verdict.accepted, false);
  assert.equal(verdict.status, 'Wrong Answer');
  assert.equal(verdict.runtimePercentile, null);
});

test('the problem slug comes from the page path', () => {
  assert.equal(slugFromPath('/problems/two-sum/description/'), 'two-sum');
  assert.equal(slugFromPath('/problems/two-sum'), 'two-sum');
  assert.equal(slugFromPath('/problemset/'), null);
});
