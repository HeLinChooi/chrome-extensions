import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, pauseSite, resumeSite, pausedSites, pauseOf, nextPauseEnd, dropEndedPauses } from '../src/lib/settings.js';

const HOUR = 3_600_000;
const now = Date.UTC(2026, 9, 3, 12);

test('a site paused for an hour is paused during that hour', () => {
  const settings = pauseSite(DEFAULT_SETTINGS, 'bbc.com', now + HOUR);
  assert.deepEqual(pausedSites(settings, now + HOUR - 1), ['bbc.com']);
});

test('a site paused for an hour is blocked again when the hour ends', () => {
  const settings = pauseSite(DEFAULT_SETTINGS, 'bbc.com', now + HOUR);
  assert.deepEqual(pausedSites(settings, now + HOUR), []);
});

test('a site paused always stays paused', () => {
  const settings = pauseSite(DEFAULT_SETTINGS, 'bbc.com', null);
  assert.deepEqual(pausedSites(settings, now + 1000 * 24 * HOUR), ['bbc.com']);
});

test('resuming a site removes its pause', () => {
  const settings = resumeSite(pauseSite(DEFAULT_SETTINGS, 'bbc.com', null), 'bbc.com');
  assert.deepEqual(settings.paused, {});
});

test('the pause of a parent domain covers a subdomain', () => {
  const settings = pauseSite(DEFAULT_SETTINGS, 'bbc.com', now + HOUR);
  assert.deepEqual(pauseOf(settings, 'news.bbc.com', now), { site: 'bbc.com', until: now + HOUR });
});

test('a pause does not cover a different site that ends the same way', () => {
  const settings = pauseSite(DEFAULT_SETTINGS, 'news.com', null);
  assert.equal(pauseOf(settings, 'fakenews.com', now), null);
});

test('a site with no pause has no pause', () => {
  assert.equal(pauseOf(DEFAULT_SETTINGS, 'bbc.com', now), null);
});

test('a pause that has ended is not reported', () => {
  const settings = pauseSite(DEFAULT_SETTINGS, 'bbc.com', now - 1);
  assert.equal(pauseOf(settings, 'bbc.com', now), null);
});

test('the next pause end is the earliest one still in the future', () => {
  let settings = pauseSite(DEFAULT_SETTINGS, 'a.com', now + 24 * HOUR);
  settings = pauseSite(settings, 'b.com', now + HOUR);
  settings = pauseSite(settings, 'c.com', null);
  assert.equal(nextPauseEnd(settings, now), now + HOUR);
});

test('there is no next pause end when every pause is always', () => {
  assert.equal(nextPauseEnd(pauseSite(DEFAULT_SETTINGS, 'a.com', null), now), null);
});

test('ended pauses are dropped and the others kept', () => {
  let settings = pauseSite(DEFAULT_SETTINGS, 'a.com', now - 1);
  settings = pauseSite(settings, 'b.com', null);
  assert.deepEqual(dropEndedPauses(settings, now).paused, { 'b.com': null });
});
