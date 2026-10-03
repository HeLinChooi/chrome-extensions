import { LISTS } from '../lib/lists.js';
import { withDefaults, siteOf, togglePause } from '../lib/settings.js';
import { siteMatches } from '../lib/cosmetic.js';

const $ = (id) => document.getElementById(id);

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const site = tab?.url ? siteOf(tab.url) : null;

async function load() {
  return withDefaults((await chrome.storage.local.get('settings')).settings);
}

async function save(settings) {
  await chrome.storage.local.set({ settings });
}

/** Ids of each list's allow rules. A match on one of those is not a block. */
const allowIds = Object.fromEntries(
  await Promise.all(
    LISTS.map(async (list) => {
      const response = await fetch(chrome.runtime.getURL(`rules/${list.id}.allow-ids.json`));
      return [list.id, new Set(await response.json())];
    }),
  ),
);

async function blockedCounts() {
  const counts = Object.fromEntries(LISTS.map((list) => [list.id, 0]));
  if (!tab) return counts;
  const { rulesMatchedInfo } = await chrome.declarativeNetRequest.getMatchedRules({ tabId: tab.id });
  for (const { rule } of rulesMatchedInfo) {
    if (rule.rulesetId in counts && !allowIds[rule.rulesetId].has(rule.ruleId)) counts[rule.rulesetId]++;
  }
  return counts;
}

function renderCounts(counts) {
  $('total').textContent = String(Object.values(counts).reduce((a, b) => a + b, 0));
  $('counts').replaceChildren(
    ...LISTS.map((list) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = list.name;
      const count = document.createElement('span');
      count.textContent = String(counts[list.id]);
      item.append(name, count);
      return item;
    }),
  );
}

function render(settings) {
  const paused = site !== null && siteMatches(settings.pausedSites, site);
  $('site').textContent = site ?? '';
  $('noSite').hidden = site !== null;
  $('pause').hidden = site === null || !settings.enabled;
  $('pause').textContent = paused ? `Paused on ${site}. Resume` : `Pause on ${site}`;
  $('pause').classList.toggle('paused', paused);
  $('enabled').checked = settings.enabled;

  $('lists').replaceChildren(
    ...LISTS.map((list) => {
      const label = document.createElement('label');
      label.className = 'switch';
      const text = document.createElement('span');
      text.textContent = list.name;
      const source = document.createElement('small');
      source.textContent = list.source;
      text.append(source);
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = settings.lists[list.id];
      input.disabled = !settings.enabled;
      input.addEventListener('change', async () => {
        const current = await load();
        await save({ ...current, lists: { ...current.lists, [list.id]: input.checked } });
      });
      label.append(text, input);
      return label;
    }),
  );
}

$('pause').addEventListener('click', async () => {
  await save(togglePause(await load(), site));
  // The page has to load again for its requests to be blocked or allowed.
  await chrome.tabs.reload(tab.id);
});

$('enabled').addEventListener('change', async () => save({ ...(await load()), enabled: $('enabled').checked }));

chrome.storage.onChanged.addListener(async () => render(await load()));
render(await load());
renderCounts(await blockedCounts().catch(() => Object.fromEntries(LISTS.map((l) => [l.id, 0]))));
