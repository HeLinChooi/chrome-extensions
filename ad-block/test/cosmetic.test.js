import test from 'node:test';
import assert from 'node:assert/strict';
import { hostSuffixes, genericExcludedHosts, selectorsFor, cssFor, excludeMatchesFor } from '../src/lib/cosmetic.js';

const lists = {
  generic: ['.ad', '.banner'],
  specific: { 'news.com': ['.promo'], 'shop.com': ['.deal'] },
  exceptions: { 'news.com': ['.promo'], 'm.news.com': [], 'blog.com': ['.banner'] },
  generichide: ['forum.com'],
};
const db = { ...lists, genericExcluded: genericExcludedHosts(lists) };

test('a host is matched by itself and every parent domain', () => {
  assert.deepEqual(hostSuffixes('a.b.news.com'), ['a.b.news.com', 'b.news.com', 'news.com', 'com']);
});

test('site selectors apply to subdomains', () => {
  assert.deepEqual(selectorsFor(db, 'www.shop.com'), ['.deal']);
});

test('a site exception removes that site selector', () => {
  assert.deepEqual(selectorsFor(db, 'news.com'), []);
});

test('a site with no rules gets no selectors here, because the generic stylesheet covers it', () => {
  assert.deepEqual(selectorsFor(db, 'other.com'), []);
});

test('a site with a generic exception gets the generic selectors minus the exception', () => {
  assert.deepEqual(selectorsFor(db, 'blog.com'), ['.ad']);
});

test('a $generichide site gets no generic selectors at all', () => {
  assert.deepEqual(selectorsFor(db, 'forum.com'), []);
});

test('sites with generic exceptions are kept out of the generic stylesheet', () => {
  assert.deepEqual(genericExcludedHosts(db), ['blog.com', 'forum.com']);
});

test('excluded hosts become match patterns that cover their subdomains', () => {
  assert.deepEqual(excludeMatchesFor(['blog.com']), ['*://*.blog.com/*']);
});

test('an IP address is not turned into a match pattern, which Chrome would reject', () => {
  assert.deepEqual(excludeMatchesFor(['10.0.0.1', 'blog.com']), ['*://*.blog.com/*']);
});

test('the CSS hides each selector in its own rule, so one bad selector cannot void the rest', () => {
  assert.equal(cssFor(['.a', '.b']), '.a{display:none!important}\n.b{display:none!important}');
});
