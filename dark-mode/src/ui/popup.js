import { DEFAULT_SETTINGS, LIMITS, withDefaults, siteOf, isDarkFor, toggleSite } from '../lib/settings.js';

const $ = (id) => document.getElementById(id);
const SLIDERS = Object.keys(LIMITS);

const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
const site = tab?.url ? siteOf(tab.url) : null;

async function load() {
  return withDefaults((await chrome.storage.local.get('settings')).settings);
}

async function save(settings) {
  await chrome.storage.local.set({ settings });
}

function render(settings) {
  $('enabled').checked = settings.enabled;
  $('siteRow').hidden = site === null;
  $('noSite').hidden = site !== null;
  $('site').textContent = site ?? '';
  $('siteOn').checked = isDarkFor(settings, site);
  for (const key of SLIDERS) {
    $(key).value = String(settings.theme[key]);
    $(key).nextElementSibling.textContent = String(settings.theme[key]);
  }
}

$('enabled').addEventListener('change', async () => save({ ...(await load()), enabled: $('enabled').checked }));
$('siteOn').addEventListener('change', async () => save(toggleSite(await load(), site)));
$('reset').addEventListener('click', async () => save({ ...(await load()), theme: { ...DEFAULT_SETTINGS.theme } }));

for (const key of SLIDERS) {
  // Shows the number while dragging, and saves once the slider is released.
  $(key).addEventListener('input', () => ($(key).nextElementSibling.textContent = $(key).value));
  $(key).addEventListener('change', async () => {
    const settings = await load();
    await save({ ...settings, theme: { ...settings.theme, [key]: Number($(key).value) } });
  });
}

chrome.storage.onChanged.addListener(async () => render(await load()));
render(await load());
