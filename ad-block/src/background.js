import { LISTS } from './lib/lists.js';
import { withDefaults, enabledLists, siteOf, pausedSites, pauseOf, nextPauseEnd, dropEndedPauses } from './lib/settings.js';
import { selectorsFor, cssFor, excludeMatchesFor } from './lib/cosmetic.js';

const PAUSE_RULE_ID = 1;
// Higher than any list rule, so a paused site is allowed even over $important.
const PAUSE_PRIORITY = 100;
const GENERIC_PREFIX = 'generic-';
const PAUSE_END_ALARM = 'pause-end';

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
async function applyPause(settings, paused) {
  const addRules = paused.length
    ? [
        {
          id: PAUSE_RULE_ID,
          priority: PAUSE_PRIORITY,
          action: { type: 'allowAllRequests' },
          condition: { requestDomains: paused, resourceTypes: ['main_frame'] },
        },
      ]
    : [];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [PAUSE_RULE_ID], addRules });

  // Wakes the worker when the next timed pause ends, so blocking comes back on time.
  await chrome.alarms.clear(PAUSE_END_ALARM);
  const end = nextPauseEnd(settings, Date.now());
  if (end !== null) await chrome.alarms.create(PAUSE_END_ALARM, { when: end });
}

/** Registers each enabled list's generic stylesheet, so Chrome injects it into every frame. */
async function applyGenericCss(settings, paused) {
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
      excludeMatches: excludeMatchesFor([...db.genericExcluded, ...paused]),
      css: [`cosmetic/${list.id}.css`],
      allFrames: true,
      runAt: 'document_start',
    });
  }
  if (scripts.length) await chrome.scripting.registerContentScripts(scripts);
}

/**
 * The tail of the queue of apply() runs. Two runs at the same time would both
 * register the generic stylesheets, and Chrome rejects a duplicate id.
 */
let applying = Promise.resolve();
function queueApply() {
  const run = applying.then(apply);
  applying = run.catch((error) => console.error('[ad-block] apply', error));
  return run;
}

async function apply() {
  const settings = await loadSettings();
  const paused = pausedSites(settings, Date.now());
  await applyRulesets(settings);
  await applyPause(settings, paused);
  await applyGenericCss(settings, paused);
}

/** Hides the site-specific selectors in the frame that asked. */
async function hideInFrame(sender) {
  const settings = await loadSettings();
  const pageSite = siteOf(sender.tab?.url ?? '');
  const frameHost = siteOf(sender.url ?? '');
  if (!pageSite || !frameHost || pauseOf(settings, pageSite, Date.now())) return;

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

chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type === 'cosmetic') {
    hideInFrame(sender).catch((error) => console.warn('[ad-block] cosmetic', sender.url, error));
  }
  // The popup waits for this before it reloads a tab, so the page loads under the new rules.
  if (message?.type === 'apply') {
    queueApply().then(() => reply({ ok: true }), (error) => reply({ error: String(error) }));
    return true; // reply is sent asynchronously
  }
  return false;
});

chrome.runtime.onInstalled.addListener(queueApply);
chrome.runtime.onStartup.addListener(queueApply);

// Saving the settings without the ended pause runs queueApply() through storage.onChanged.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== PAUSE_END_ALARM) return;
  const settings = await loadSettings();
  await chrome.storage.local.set({ settings: dropEndedPauses(settings, Date.now()) });
});
chrome.storage.onChanged.addListener((changes) => changes.settings && queueApply());

chrome.declarativeNetRequest.setExtensionActionOptions({ displayActionCountAsBadgeText: true });
chrome.action.setBadgeBackgroundColor({ color: '#4b5563' });
