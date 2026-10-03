import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SETTINGS, siteOf, frameSite, isDarkFor, toggleSite, themeOf, withDefaults } from '../src/lib/settings.js';

test('the site of a URL is its host name without www', () => {
  assert.equal(siteOf('https://www.example.com/a?b=1'), 'example.com');
});

test('a subdomain other than www is kept', () => {
  assert.equal(siteOf('https://docs.github.com/'), 'docs.github.com');
});

test('a URL that is not a web page has no site', () => {
  assert.equal(siteOf('chrome://extensions/'), null);
});

test('text that is not a URL has no site', () => {
  assert.equal(siteOf('not a url'), null);
});

test('an iframe belongs to the site of the top page', () => {
  const location = { href: 'https://ads.example.net/frame', ancestorOrigins: ['https://www.news.com'] };
  assert.equal(frameSite(location), 'news.com');
});

test('a top page belongs to its own site', () => {
  assert.equal(frameSite({ href: 'https://www.news.com/today', ancestorOrigins: [] }), 'news.com');
});

test('every site is dark by default', () => {
  assert.equal(isDarkFor(DEFAULT_SETTINGS, 'example.com'), true);
});

test('a site that was turned off is not dark', () => {
  const settings = toggleSite(DEFAULT_SETTINGS, 'example.com');
  assert.equal(isDarkFor(settings, 'example.com'), false);
});

test('turning a site off leaves other sites dark', () => {
  const settings = toggleSite(DEFAULT_SETTINGS, 'example.com');
  assert.equal(isDarkFor(settings, 'other.com'), true);
});

test('toggling a site twice turns it back on', () => {
  const settings = toggleSite(toggleSite(DEFAULT_SETTINGS, 'example.com'), 'example.com');
  assert.deepEqual(settings.sites, {});
});

test('no site is dark when dark mode everywhere is off', () => {
  assert.equal(isDarkFor({ ...DEFAULT_SETTINGS, enabled: false }, 'example.com'), false);
});

test('a site can be turned on while dark mode everywhere is off', () => {
  const settings = toggleSite({ ...DEFAULT_SETTINGS, enabled: false }, 'example.com');
  assert.equal(isDarkFor(settings, 'example.com'), true);
});

test('turning one site on leaves other sites light while dark mode everywhere is off', () => {
  const settings = toggleSite({ ...DEFAULT_SETTINGS, enabled: false }, 'example.com');
  assert.equal(isDarkFor(settings, 'other.com'), false);
});

test('a site turned off stays off when dark mode everywhere is switched off and on again', () => {
  const off = toggleSite(DEFAULT_SETTINGS, 'example.com');
  const settings = { ...off, enabled: true };
  assert.equal(isDarkFor({ ...settings, enabled: false }, 'example.com') || isDarkFor(settings, 'example.com'), false);
});

test('sites turned off with the old setting are still off', () => {
  const settings = withDefaults({ disabledSites: ['example.com'] });
  assert.equal(isDarkFor(settings, 'example.com'), false);
});

test('a page with no site is never dark', () => {
  assert.equal(isDarkFor(DEFAULT_SETTINGS, null), false);
});

test('the theme passes brightness, contrast, sepia and grayscale to Dark Reader', () => {
  const theme = themeOf({ ...DEFAULT_SETTINGS, theme: { brightness: 90, contrast: 110, sepia: 10, grayscale: 0 } });
  assert.deepEqual(theme, { brightness: 90, contrast: 110, sepia: 10, grayscale: 0 });
});

test('theme values outside the slider range are clamped', () => {
  const theme = themeOf({ ...DEFAULT_SETTINGS, theme: { brightness: 500, contrast: -5, sepia: 10, grayscale: 0 } });
  assert.deepEqual([theme.brightness, theme.contrast], [150, 50]);
});

test('stored settings missing a theme value get the default', () => {
  const settings = withDefaults({ theme: { brightness: 80 } });
  assert.deepEqual(settings.theme, { brightness: 80, contrast: 100, sepia: 0, grayscale: 0 });
});
