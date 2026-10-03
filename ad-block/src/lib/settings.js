import { LISTS } from './lists.js';

export const DEFAULT_SETTINGS = {
  enabled: true,
  lists: Object.fromEntries(LISTS.map((list) => [list.id, true])),
  pausedSites: [],
};

export function withDefaults(stored = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    lists: { ...DEFAULT_SETTINGS.lists, ...stored.lists },
    pausedSites: stored.pausedSites ?? [],
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

export function togglePause(settings, site) {
  const paused = settings.pausedSites.includes(site);
  return {
    ...settings,
    pausedSites: paused ? settings.pausedSites.filter((s) => s !== site) : [...settings.pausedSites, site],
  };
}
