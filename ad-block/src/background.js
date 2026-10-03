import { LISTS } from './lib/lists.js';
import { withDefaults, enabledLists, siteOf } from './lib/settings.js';
import { selectorsFor, cssFor, excludeMatchesFor, siteMatches } from './lib/cosmetic.js';

const PAUSE_RULE_ID = 1;
// Higher than any list rule, so a paused site is allowed even over $important.
const PAUSE_PRIORITY = 100;
const GENERIC_PREFIX = 'generic-';

async function loadSettings() {
  return withDefaults((await chrome.storage.local.get('settings')).settings);
}

/** Cosmetic data for each list, read once per service-worker lifetime. */
const cosmeticCache = new Map();
function cosmeticDb(id) {
  if (!cosmeticCache.has(id)) {
    cosmeticCache.set(id, fetch(chrome.runtime.getURL(`cosmetic/${id}.json`)).then((r) => r.json()));
  }
  return cosmeticCache.get(id);
}

async function applyRulesets(settings) {
  const on = new Set(enabledLists(settings).map((list) => list.id));
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: LISTS.filter((l) => on.has(l.id)).map((l) => l.id),
    disableRulesetIds: LISTS.filter((l) => !on.has(l.id)).map((l) => l.id),
  });
}

/** A paused site is one rule that allows every request made by its pages. */
async function applyPause(settings) {
  const addRules = settings.pausedSites.length
    ? [
        {
          id: PAUSE_RULE_ID,
          priority: PAUSE_PRIORITY,
          action: { type: 'allowAllRequests' },
          condition: { requestDomains: settings.pausedSites, resourceTypes: ['main_frame'] },
        },
      ]
    : [];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [PAUSE_RULE_ID], addRules });
}

/** Registers each enabled list's generic stylesheet, so Chrome injects it into every frame. */
async function applyGenericCss(settings) {
  const registered = await chrome.scripting.getRegisteredContentScripts();
  const ids = registered.map((s) => s.id).filter((id) => id.startsWith(GENERIC_PREFIX));
  if (ids.length) await chrome.scripting.unregisterContentScripts({ ids });

  const scripts = [];
  for (const list of enabledLists(settings)) {
    const db = await cosmeticDb(list.id);
    if (!db.generic.length) continue;
    scripts.push({
      id: GENERIC_PREFIX + list.id,
      matches: ['<all_urls>'],
      excludeMatches: excludeMatchesFor([...db.genericExcluded, ...settings.pausedSites]),
      css: [`cosmetic/${list.id}.css`],
      allFrames: true,
      runAt: 'document_start',
    });
  }
  if (scripts.length) await chrome.scripting.registerContentScripts(scripts);
}

async function apply() {
  const settings = await loadSettings();
  await applyRulesets(settings);
  await applyPause(settings);
  await applyGenericCss(settings);
}

/** Hides the site-specific selectors in the frame that asked. */
async function hideInFrame(sender) {
  const settings = await loadSettings();
  const pageSite = siteOf(sender.tab?.url ?? '');
  const frameHost = siteOf(sender.url ?? '');
  if (!pageSite || !frameHost || siteMatches(settings.pausedSites, pageSite)) return;

  const selectors = [];
  for (const list of enabledLists(settings)) selectors.push(...selectorsFor(await cosmeticDb(list.id), frameHost));
  if (!selectors.length) return;

  await chrome.scripting.insertCSS({
    target: { tabId: sender.tab.id, frameIds: [sender.frameId] },
    css: cssFor([...new Set(selectors)]),
    // A user stylesheet wins over the page's own !important rules.
    origin: 'USER',
  });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'cosmetic') {
    hideInFrame(sender).catch((error) => console.warn('[ad-block] cosmetic', sender.url, error));
  }
  return false;
});

chrome.runtime.onInstalled.addListener(apply);
chrome.storage.onChanged.addListener((changes) => changes.settings && apply());

chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
chrome.action.setBadgeBackgroundColor({ color: '#4b5563' });
