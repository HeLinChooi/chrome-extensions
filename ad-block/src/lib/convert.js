/**
 * Converts Adblock Plus filter lists (EasyList syntax) into Chrome's
 * declarativeNetRequest rules and into cosmetic (element-hiding) selectors.
 * It runs at build time in Node.
 *
 * Only filters Chrome can apply exactly are kept. Anything else is dropped,
 * because a filter applied with the wrong meaning breaks pages. Dropped:
 * regular expressions, $popup, $redirect, $csp, $removeparam, and scriptlets.
 *
 * Filter syntax: https://help.adblockplus.org/hc/en-us/articles/360062733293
 */

const RESOURCE_TYPES = {
  script: 'script',
  image: 'image',
  stylesheet: 'stylesheet',
  css: 'stylesheet',
  object: 'object',
  xmlhttprequest: 'xmlhttprequest',
  xhr: 'xmlhttprequest',
  subdocument: 'sub_frame',
  frame: 'sub_frame',
  ping: 'ping',
  beacon: 'ping',
  media: 'media',
  font: 'font',
  websocket: 'websocket',
  other: 'other',
};

const PRIORITY = { normal: 1, important: 2 };

// Cosmetic options belong to element hiding, not to network rules.
const COSMETIC_EXCEPTION_OPTIONS = new Set(['generichide', 'elemhide', 'ehide', 'ghide', 'specifichide', 'shide']);

// Procedural selectors are not CSS, so a browser cannot apply them as a stylesheet.
const PROCEDURAL = /:-abp-|:has-text\(|:contains\(|:xpath\(|:matches-css|:matches-attr|:matches-path|:min-text-length|:upward\(|:remove\(|:style\(|:watch-attr|:others\(/;

const EXTENDED_COSMETIC = /#@?[?$%]#/;
const COSMETIC = /^([^#]*)(#@?#)(.+)$/;
const DOMAIN_ONLY = /^\|\|([a-z0-9.-]+)\^$/;
const ASCII = /^[\x21-\x7e]*$/;

/** A domain Chrome can match exactly: lower-case ASCII, with no wildcard or regex. */
function usableDomain(domain) {
  return /^[a-z0-9.-]+$/.test(domain);
}

/** Splits "a.com|~b.com" or "a.com,~b.com" into included and excluded domains. */
function splitDomains(list, separator) {
  const include = [];
  const exclude = [];
  let dropped = false;
  for (const raw of list.split(separator)) {
    const entry = raw.trim().toLowerCase();
    if (!entry) continue;
    const negated = entry.startsWith('~');
    const domain = negated ? entry.slice(1) : entry;
    if (!usableDomain(domain)) {
      dropped ||= !negated;
      continue;
    }
    (negated ? exclude : include).push(domain);
  }
  // A filter for "shop.*" only would otherwise apply everywhere.
  if (dropped && include.length === 0) return null;
  return { include, exclude };
}

/**
 * Parses one network filter.
 * @returns the parsed filter, or null for a comment, a cosmetic filter, or a filter Chrome cannot apply
 */
export function parseNetwork(line) {
  let text = line.trim();
  if (!text || text.startsWith('!') || text.startsWith('[')) return null;
  if (COSMETIC.test(text) || EXTENDED_COSMETIC.test(text)) return null;

  const allow = text.startsWith('@@');
  if (allow) text = text.slice(2);

  const dollar = text.lastIndexOf('$');
  const pattern = dollar === -1 ? text : text.slice(0, dollar);
  const options = dollar === -1 ? [] : text.slice(dollar + 1).split(',');

  if (pattern.length > 1 && pattern.startsWith('/') && pattern.endsWith('/')) return null;
  if (!ASCII.test(pattern) || pattern.startsWith('||*')) return null;

  const filter = {
    allow,
    pattern,
    types: [],
    excludedTypes: [],
    domainType: null,
    include: [],
    exclude: [],
    important: false,
    matchCase: false,
    document: false,
  };

  for (const option of options) {
    const [name, value] = option.split('=');
    const negated = name.startsWith('~');
    const key = negated ? name.slice(1) : name;

    if (key in RESOURCE_TYPES) (negated ? filter.excludedTypes : filter.types).push(RESOURCE_TYPES[key]);
    else if (key === 'document' || key === 'doc') {
      if (negated) return null;
      filter.document = true;
    } else if (key === 'third-party' || key === '3p') filter.domainType = negated ? 'firstParty' : 'thirdParty';
    else if (key === 'first-party' || key === '1p') filter.domainType = negated ? 'thirdParty' : 'firstParty';
    else if (key === 'domain' && value) {
      const domains = splitDomains(value, '|');
      if (!domains) return null;
      filter.include = domains.include;
      filter.exclude = domains.exclude;
    } else if (key === 'important') filter.important = true;
    else if (key === 'match-case') filter.matchCase = true;
    else return null; // $popup, $redirect, $csp, $generichide, or anything unknown
  }

  const matchesEverything = pattern === '' || pattern === '*' || pattern === '|' || pattern === '||';
  if (matchesEverything && filter.include.length === 0) return null;
  return filter;
}

/**
 * The host of an exception like "@@||blog.com^$generichide": a site where
 * generic element hiding is turned off. Null for any other line.
 */
export function parseGenericHide(line) {
  const match = /^@@\|\|([a-z0-9.-]+)\^\$(.+)$/.exec(line.trim());
  if (!match) return null;
  const options = match[2].split(',');
  return options.some((o) => COSMETIC_EXCEPTION_OPTIONS.has(o) && o !== 'specifichide' && o !== 'shide') ? match[1] : null;
}

function conditionOf(filter) {
  const condition = {};
  const domain = DOMAIN_ONLY.exec(filter.pattern);
  if (domain) condition.requestDomains = [domain[1]];
  else if (!['', '*'].includes(filter.pattern)) condition.urlFilter = filter.pattern;

  if (filter.domainType) condition.domainType = filter.domainType;
  if (filter.include.length) condition.initiatorDomains = filter.include;
  if (filter.exclude.length) condition.excludedInitiatorDomains = filter.exclude;

  if (filter.allow && filter.document) condition.resourceTypes = ['main_frame', 'sub_frame'];
  else {
    const types = filter.document ? [...filter.types, 'main_frame'] : filter.types;
    if (types.length) condition.resourceTypes = types;
    if (filter.excludedTypes.length) condition.excludedResourceTypes = filter.excludedTypes;
  }
  if (filter.matchCase) condition.isUrlFilterCaseSensitive = true;
  return condition;
}

function actionOf(filter) {
  if (!filter.allow) return { type: 'block' };
  return { type: filter.document ? 'allowAllRequests' : 'allow' };
}

/**
 * Turns parsed filters into declarativeNetRequest rules. Filters of the form
 * "||domain^" that share every option become one rule with a list of
 * requestDomains. EasyList has tens of thousands of them, and Chrome
 * guarantees an extension only 30,000 static rules.
 */
export function toRules(filters) {
  const rules = [];
  const merged = new Map();

  for (const filter of filters) {
    if (!filter) continue;
    const condition = conditionOf(filter);
    const rule = {
      id: 0,
      priority: filter.important && !filter.allow ? PRIORITY.important : PRIORITY.normal,
      action: actionOf(filter),
      condition,
    };
    if (condition.requestDomains) {
      const { requestDomains, ...rest } = condition;
      const key = JSON.stringify([rule.priority, rule.action, rest]);
      const existing = merged.get(key);
      if (existing) {
        existing.condition.requestDomains.push(...requestDomains);
        continue;
      }
      merged.set(key, rule);
    }
    rules.push(rule);
  }

  rules.forEach((rule, index) => (rule.id = index + 1));
  return rules;
}

/**
 * Parses one element-hiding filter, such as "a.com,~b.a.com##.ad".
 * @returns { include, exclude, selector, exception }, or null if it is not one Chrome can apply as CSS
 */
export function parseCosmetic(line) {
  const text = line.trim();
  if (EXTENDED_COSMETIC.test(text)) return null;
  const match = COSMETIC.exec(text);
  if (!match) return null;

  const [, domainList, separator, selector] = match;
  if (selector.startsWith('+js') || selector.startsWith('^') || PROCEDURAL.test(selector)) return null;

  const domains = splitDomains(domainList, ',');
  if (!domains) return null;
  return { ...domains, selector, exception: separator === '#@#' };
}

function addTo(map, host, selector) {
  if (!map.has(host)) map.set(host, new Set());
  map.get(host).add(selector);
}

/** Drops the given selectors from every host, and drops hosts left with none. */
function withoutSelectors(map, selectors) {
  const result = new Map();
  for (const [host, hostSelectors] of map) {
    const kept = [...hostSelectors].filter((s) => !selectors.has(s));
    if (kept.length) result.set(host, new Set(kept));
  }
  return result;
}

const toObject = (map) => Object.fromEntries([...map].map(([host, selectors]) => [host, [...selectors]]));

/**
 * Converts a whole filter list.
 * @returns rules for declarativeNetRequest, cosmetic selectors, and counts for the build log
 */
export function convertList(text) {
  const filters = [];
  const generic = new Set();
  const genericExceptions = new Set();
  const specific = new Map();
  const exceptions = new Map();
  const generichide = new Set();
  let cosmeticCount = 0;
  let lines = 0;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('!') || trimmed.startsWith('[')) continue;
    lines++;

    const host = parseGenericHide(trimmed);
    if (host) {
      generichide.add(host);
      continue;
    }

    const cosmetic = parseCosmetic(trimmed);
    if (cosmetic) {
      cosmeticCount++;
      const { include, exclude, selector, exception } = cosmetic;
      if (exception && include.length === 0) {
        if (exclude.length === 0) genericExceptions.add(selector);
      } else if (exception) {
        for (const h of include) addTo(exceptions, h, selector);
      } else {
        if (include.length === 0) generic.add(selector);
        for (const h of include) addTo(specific, h, selector);
        for (const h of exclude) addTo(exceptions, h, selector);
      }
      continue;
    }

    const filter = parseNetwork(trimmed);
    if (filter) filters.push(filter);
  }

  const rules = toRules(filters);
  return {
    rules,
    cosmetic: {
      generic: [...generic].filter((s) => !genericExceptions.has(s)),
      specific: toObject(withoutSelectors(specific, genericExceptions)),
      exceptions: toObject(exceptions),
      generichide: [...generichide],
    },
    stats: { lines, networkFilters: filters.length, rules: rules.length, cosmeticFilters: cosmeticCount },
  };
}
