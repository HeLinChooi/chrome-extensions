import { LISTS } from './lists.js';
import { hostSuffixes } from './cosmetic.js';

export const DEFAULT_SETTINGS = {
  enabled: true,
  lists: Object.fromEntries(LISTS.map((list) => [list.id, true])),
  // Site → time its pause ends, in milliseconds since 1970. null means always.
  paused: {},
};

export function withDefaults(stored = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    lists: { ...DEFAULT_SETTINGS.lists, ...stored.lists },
    paused: { ...stored.paused },
  };
}

export function enabledLists(settings) {
  return settings.enabled ? LISTS.filter((list) => settings.lists[list.id]) : [];
}

/** The host name without "www.", or null for a page that is not http or https. */
export function siteOf(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  return parsed.hostname.replace(/^www\./, '');
}

const isActive = (until, now) => until === null || until > now;

/** @param until when the pause ends, in milliseconds since 1970, or null for always */
export function pauseSite(settings, site, until) {
  return { ...settings, paused: { ...settings.paused, [site]: until } };
}

export function resumeSite(settings, site) {
  const { [site]: _removed, ...paused } = settings.paused;
  return { ...settings, paused };
}

/** Sites paused right now. */
export function pausedSites(settings, now) {
  return Object.entries(settings.paused)
    .filter(([, until]) => isActive(until, now))
    .map(([site]) => site);
}

/** The pause that covers a host, from the host itself or a parent domain, or null. */
export function pauseOf(settings, host, now) {
  for (const site of hostSuffixes(host)) {
    if (site in settings.paused && isActive(settings.paused[site], now)) return { site, until: settings.paused[site] };
  }
  return null;
}

/** When the next timed pause ends, or null if none will. */
export function nextPauseEnd(settings, now) {
  const ends = Object.values(settings.paused).filter((until) => until !== null && until > now);
  return ends.length ? Math.min(...ends) : null;
}

export function dropEndedPauses(settings, now) {
  return { ...settings, paused: Object.fromEntries(Object.entries(settings.paused).filter(([, until]) => isActive(until, now))) };
}
