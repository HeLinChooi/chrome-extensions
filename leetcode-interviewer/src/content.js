/**
 * Runs in the extension's isolated world on LeetCode problem pages. It keeps
 * the latest snapshot from page.js and passes it to the side panel.
 */

import { readSnapshotMessage } from './lib/page-state.js';

/** The latest snapshot, so a panel opened later can ask for it. */
let latest = null;

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const snapshot = readSnapshotMessage(event.data);
  if (!snapshot) return;
  latest = { ...snapshot, title: document.title.replace(/ - LeetCode$/, '') };
  // Fails when no panel is open to receive it. The panel asks for `latest` when it opens.
  chrome.runtime.sendMessage({ type: 'snapshot', snapshot: latest }).catch(() => {});
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'get-snapshot') sendResponse(latest);
});
