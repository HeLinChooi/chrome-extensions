/**
 * The side panel. For now it shows the open problem and the code in the
 * editor, to prove the extension can read them (Stage 2).
 */

const titleEl = document.getElementById('title');
const languageEl = document.getElementById('language');
const codeEl = document.getElementById('code');

/** The tab the panel is showing; snapshots from other tabs are ignored. */
let tabId = null;

function show(snapshot) {
  if (!snapshot) {
    titleEl.textContent = 'Open a LeetCode problem.';
    languageEl.textContent = '';
    codeEl.textContent = '';
    return;
  }
  titleEl.textContent = snapshot.title;
  languageEl.textContent = snapshot.language;
  codeEl.textContent = snapshot.code;
}

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id ?? null;
  // Fails on tabs without the content script, such as any page that is not a LeetCode problem.
  const snapshot = tabId === null ? null : await chrome.tabs.sendMessage(tabId, { type: 'get-snapshot' }).catch(() => null);
  show(snapshot);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'snapshot' && sender.tab?.id === tabId) show(message.snapshot);
});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((id, change) => {
  if (id === tabId && change.status === 'complete') refresh();
});

refresh();
