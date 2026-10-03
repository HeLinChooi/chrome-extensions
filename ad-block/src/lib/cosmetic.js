/**
 * Element hiding: which CSS selectors to hide on a given host. No Chrome
 * calls, so it can be tested in Node.
 *
 * Generic selectors apply to every site. They are a static stylesheet that
 * Chrome injects itself, which is fast. A site with an exception to a
 * generic selector is excluded from that stylesheet. For those sites,
 * `selectorsFor` returns the generic selectors minus the exceptions.
 */

/** "a.news.com" → ["a.news.com", "news.com", "com"] */
export function hostSuffixes(host) {
  const parts = host.split('.');
  return parts.map((_, i) => parts.slice(i).join('.'));
}

export function siteMatches(sites, host) {
  return hostSuffixes(host).some((suffix) => sites.includes(suffix));
}

function collect(map, suffixes) {
  return new Set(suffixes.flatMap((suffix) => map[suffix] ?? []));
}

/** Hosts that must not get the generic stylesheet. The build stores them in the list's JSON as genericExcluded. */
export function genericExcludedHosts(db) {
  const generic = new Set(db.generic);
  const hosts = Object.entries(db.exceptions)
    .filter(([, selectors]) => selectors.some((s) => generic.has(s)))
    .map(([host]) => host);
  return [...new Set([...hosts, ...db.generichide])].sort();
}

/** @param db one list's cosmetic JSON, as written by scripts/lists.mjs */
export function selectorsFor(db, host) {
  const suffixes = hostSuffixes(host);
  const exceptions = collect(db.exceptions, suffixes);
  const selectors = [...collect(db.specific, suffixes)];

  const noGeneric = suffixes.some((s) => db.generichide.includes(s));
  if (!noGeneric && suffixes.some((s) => db.genericExcluded.includes(s))) selectors.push(...db.generic);

  return [...new Set(selectors)].filter((s) => !exceptions.has(s));
}

const HOST = /^(?=.*[a-z])[a-z0-9-]+(\.[a-z0-9-]+)+$/;

/** Match patterns for registerContentScripts. One invalid pattern makes Chrome reject the whole call. */
export function excludeMatchesFor(hosts) {
  return hosts.filter((host) => HOST.test(host)).map((host) => `*://*.${host}/*`);
}

export function cssFor(selectors) {
  return selectors.map((s) => `${s}{display:none!important}`).join('\n');
}
