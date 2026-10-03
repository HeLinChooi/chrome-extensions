import test from 'node:test';
import assert from 'node:assert/strict';
import { parseNetwork, toRules, parseCosmetic, convertList } from '../src/lib/convert.js';

const rule = (line) => toRules([parseNetwork(line)])[0];

test('comments, headers and blank lines are not filters', () => {
  assert.deepEqual([parseNetwork('! comment'), parseNetwork('[Adblock Plus 2.0]'), parseNetwork('')], [null, null, null]);
});

test('a plain pattern becomes a block rule with the same urlFilter', () => {
  assert.deepEqual(rule('/banner/ads/*'), {
    id: 1,
    priority: 1,
    action: { type: 'block' },
    condition: { urlFilter: '/banner/ads/*' },
  });
});

test('domain-only block rules with the same options are merged into one rule', () => {
  const rules = toRules(['||ads.com^', '||track.net^', '||spy.org^$third-party'].map(parseNetwork));
  assert.deepEqual(
    rules.map((r) => r.condition),
    [{ requestDomains: ['ads.com', 'track.net'] }, { requestDomains: ['spy.org'], domainType: 'thirdParty' }],
  );
});

test('an exception becomes an allow rule', () => {
  assert.deepEqual(rule('@@||example.com/ads.js').action, { type: 'allow' });
});

test('a $document exception allows everything on that page', () => {
  const r = rule('@@||example.com^$document');
  assert.deepEqual([r.action.type, r.condition.resourceTypes], ['allowAllRequests', ['main_frame', 'sub_frame']]);
});

test('$important outranks an exception', () => {
  assert.ok(rule('||ads.com/x$important').priority > rule('@@||ads.com/x').priority);
});

test('resource types map to declarativeNetRequest types', () => {
  assert.deepEqual(rule('/ad.$script,subdocument,xmlhttprequest').condition.resourceTypes, [
    'script',
    'sub_frame',
    'xmlhttprequest',
  ]);
});

test('negated resource types become excluded types', () => {
  assert.deepEqual(rule('/ad.$~image').condition.excludedResourceTypes, ['image']);
});

test('domain= becomes included and excluded initiator domains', () => {
  const { condition } = rule('/ad.js$domain=news.com|~safe.news.com');
  assert.deepEqual([condition.initiatorDomains, condition.excludedInitiatorDomains], [['news.com'], ['safe.news.com']]);
});

test('domain= entries with a wildcard are dropped', () => {
  assert.deepEqual(rule('/ad.js$domain=news.com|shop.*').condition.initiatorDomains, ['news.com']);
});

test('a rule whose every domain= entry has a wildcard is dropped', () => {
  assert.equal(parseNetwork('/ad.js$domain=shop.*'), null);
});

test('$match-case makes the filter case sensitive', () => {
  assert.equal(rule('/Ad.js$match-case').condition.isUrlFilterCaseSensitive, true);
});

test('options Chrome cannot apply drop the rule', () => {
  for (const line of ['||ads.com^$popup', '||ads.com^$redirect=noop.js', '||ads.com^$csp=script-src', '||a.com^$removeparam=x']) {
    assert.equal(parseNetwork(line), null, line);
  }
});

test('regular-expression filters are dropped', () => {
  assert.equal(parseNetwork('/^https?:\\/\\/ads\\./'), null);
});

test('a filter with non-ASCII characters is dropped', () => {
  assert.equal(parseNetwork('||réclame.fr^'), null);
});

test('a filter that would block every request is dropped', () => {
  assert.equal(parseNetwork('*$script'), null);
});

test('$generichide is a cosmetic exception, not a network rule', () => {
  assert.equal(parseNetwork('@@||example.com^$generichide'), null);
});

test('a generic cosmetic filter has no domains', () => {
  assert.deepEqual(parseCosmetic('##.ad-banner'), { include: [], exclude: [], selector: '.ad-banner', exception: false });
});

test('a site cosmetic filter lists its domains', () => {
  assert.deepEqual(parseCosmetic('a.com,~b.a.com##.ad'), { include: ['a.com'], exclude: ['b.a.com'], selector: '.ad', exception: false });
});

test('a cosmetic exception is marked as one', () => {
  assert.equal(parseCosmetic('a.com#@#.ad').exception, true);
});

test('extended and procedural cosmetic filters are dropped', () => {
  for (const line of ['a.com#?#.ad:has-text(Ad)', 'a.com#$#abort-on-property-read x', 'a.com##+js(noeval)', 'a.com##.ad:-abp-contains(x)', 'a.com##^script']) {
    assert.equal(parseCosmetic(line), null, line);
  }
});

test('a list converts into rules, generic selectors and site selectors', () => {
  const { rules, cosmetic } = convertList(
    ['||ads.com^', '##.ad', 'news.com##.promo', 'shop.com#@#.ad', '@@||blog.com^$generichide'].join('\n'),
  );
  assert.deepEqual(rules[0].condition.requestDomains, ['ads.com']);
  assert.deepEqual(cosmetic, {
    generic: ['.ad'],
    specific: { 'news.com': ['.promo'] },
    exceptions: { 'shop.com': ['.ad'] },
    generichide: ['blog.com'],
  });
});

test('a generic exception with no domain removes the selector everywhere', () => {
  const { cosmetic } = convertList(['##.ad', '##.banner', '#@#.banner'].join('\n'));
  assert.deepEqual(cosmetic.generic, ['.ad']);
});

test('a generic filter with excluded domains becomes an exception on those domains', () => {
  const { cosmetic } = convertList('~shop.com##.ad');
  assert.deepEqual([cosmetic.generic, cosmetic.exceptions], [['.ad'], { 'shop.com': ['.ad'] }]);
});

test('a generic exception with no domain also cancels the same selector on a single site', () => {
  const { cosmetic } = convertList(['news.com##.ad', 'news.com##.promo', '#@#.ad'].join('\n'));
  assert.deepEqual(cosmetic.specific, { 'news.com': ['.promo'] });
});
