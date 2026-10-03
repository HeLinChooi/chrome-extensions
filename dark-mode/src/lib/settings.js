/** Settings and site rules. No Chrome calls, so it can be tested in Node. */

export const LIMITS = {
  brightness: [50, 150],
  contrast: [50, 150],
  sepia: [0, 100],
  grayscale: [0, 100],
};

export const DEFAULT_SETTINGS = {
  enabled: true,
  theme: { brightness: 100, contrast: 100, sepia: 0, grayscale: 0 },
  disabledSites: [],
};

export function withDefaults(stored = {}) {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    theme: { ...DEFAULT_SETTINGS.theme, ...stored.theme },
    disabledSites: stored.disabledSites ?? [],
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
  return settings.enabled && site !== null && !settings.disabledSites.includes(site);
}

export function toggleSite(settings, site) {
  const disabled = settings.disabledSites.includes(site);
  return {
    ...settings,
    disabledSites: disabled ? settings.disabledSites.filter((s) => s !== site) : [...settings.disabledSites, site],
  };
}

/** The theme in the shape `DarkReader.enable` takes. */
export function themeOf(settings) {
  const theme = {};
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    theme[key] = Math.min(max, Math.max(min, Number(settings.theme[key])));
  }
  return theme;
}
