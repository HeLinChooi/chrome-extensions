import { withDefaults, siteOf, toggleSite } from './lib/settings.js';

async function loadSettings() {
  return withDefaults((await chrome.storage.local.get('settings')).settings);
}

async function saveSettings(settings) {
  await chrome.storage.local.set({ settings });
}

function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Fetches a stylesheet or image for a content script. See setFetchMethod in content.js. */
async function fetchForPage(url) {
  if (!/^https?:/.test(url)) return { error: `not an http URL: ${url}` };
  try {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) return { error: `HTTP ${response.status}` };
    return {
      contentType: response.headers.get('content-type') ?? '',
      base64: toBase64(await response.arrayBuffer()),
    };
  } catch (error) {
    return { error: String(error) };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  // The darkreader package also forwards its own internal messages here. They are ignored.
  if (message?.type !== 'fetch') return false;
  fetchForPage(message.url).then(reply);
  return true; // reply is sent asynchronously
});

async function activeSite() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ? siteOf(tab.url) : null;
}

const commands = {
  'toggle-everywhere': async () => {
    const settings = await loadSettings();
    await saveSettings({ ...settings, enabled: !settings.enabled });
  },
  'toggle-site': async () => {
    const site = await activeSite();
    if (site) await saveSettings(toggleSite(await loadSettings(), site));
  },
};

chrome.commands.onCommand.addListener((name) => commands[name]?.());
