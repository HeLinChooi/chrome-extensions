/** Settings and site rules. No Chrome calls, so it can be tested in Node. */

export const LIMITS = {
  brightness: [50, 150],
  contrast: [50, 150],
  sepia: [0, 100],
  grayscale: [0, 100],
};

export const DEFAULT_SETTINGS = {
  // Whether a site is dark when it has no choice of its own.
  enabled: true,
  theme: { brightness: 100, contrast: 100, sepia: 0, grayscale: 0 },
  // Site → true (dark) or false (light). Only sites that differ from `enabled` at the time they were switched.
  sites: {},
};

export function withDefaults(stored = {}) {
  const { disabledSites = [], ...rest } = stored;
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    theme: { ...DEFAULT_SETTINGS.theme, ...stored.theme },
    // disabledSites is the setting from version 0.1.0, which could only turn sites off.
    sites: { ...Object.fromEntries(disabledSites.map((site) => [site, false])), ...stored.sites },
  };
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

/**
 * The site a frame belongs to. An iframe follows the top page, so turning a
 * site off also turns off the iframes inside it.
 */
export function frameSite(location) {
  const ancestors = location.ancestorOrigins ?? [];
  return siteOf(ancestors.length ? ancestors[ancestors.length - 1] : location.href);
}

export function isDarkFor(settings, site) {
  if (site === null) return false;
  return settings.sites[site] ?? settings.enabled;
}

/** Flips one site. A site switched back to match the default loses its own choice. */
export function toggleSite(settings, site) {
  const dark = !isDarkFor(settings, site);
  const { [site]: _old, ...sites } = settings.sites;
  return { ...settings, sites: dark === settings.enabled ? sites : { ...sites, [site]: dark } };
}

/** The theme in the shape `DarkReader.enable` takes. */
export function themeOf(settings) {
  const theme = {};
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    theme[key] = Math.min(max, Math.max(min, Number(settings.theme[key])));
  }
  return theme;
}
