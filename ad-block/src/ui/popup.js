import { LISTS } from '../lib/lists.js';
import { withDefaults, siteOf, pauseSite, resumeSite, pauseOf } from '../lib/settings.js';

const $ = (id) => document.getElementById(id);
const HOUR = 3_600_000;

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

function pausedText({ site: pausedSite, until }) {
  if (until === null) return `Blocking is off on ${pausedSite}.`;
  const sameDay = new Date(until).toDateString() === new Date().toDateString();
  const time = new Date(until).toLocaleString([], {
    ...(sameDay ? {} : { weekday: 'short' }),
    hour: 'numeric',
    minute: '2-digit',
  });
  return `Blocking is off on ${pausedSite} until ${time}.`;
}

function render(settings) {
  const pause = site === null ? null : pauseOf(settings, site, Date.now());
  $('site').textContent = site ?? '';
  $('noSite').hidden = site !== null;
  $('pauseBox').hidden = site === null || !settings.enabled;
  $('pauseChoices').hidden = pause !== null;
  $('pausedNote').hidden = pause === null;
  document.querySelector('#pauseChoices .host').textContent = site ?? '';
  if (pause) $('pausedText').textContent = pausedText(pause);
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

// The page has to load again for its requests to be blocked or allowed.
async function saveAndReload(settings) {
  await save(settings);
  await chrome.runtime.sendMessage({ type: 'apply' });
  await chrome.tabs.reload(tab.id);
}

for (const button of document.querySelectorAll('#pauseChoices button')) {
  button.addEventListener('click', async () => {
    const { hours } = button.dataset;
    const until = hours === 'always' ? null : Date.now() + Number(hours) * HOUR;
    await saveAndReload(pauseSite(await load(), site, until));
  });
}

// Resumes the pause that covers this page, which may be on a parent domain.
$('resume').addEventListener('click', async () => {
  const settings = await load();
  await saveAndReload(resumeSite(settings, pauseOf(settings, site, Date.now()).site));
});

$('enabled').addEventListener('change', async () => save({ ...(await load()), enabled: $('enabled').checked }));

async function refreshCounts() {
  renderCounts(await blockedCounts().catch(() => Object.fromEntries(LISTS.map((l) => [l.id, 0]))));
}

// After a pause or resume, the tab reloads and its count starts again.
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (tabId === tab?.id && change.status === 'complete') refreshCounts();
});

chrome.storage.onChanged.addListener(async () => render(await load()));
render(await load());
await refreshCounts();
