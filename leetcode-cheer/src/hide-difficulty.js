/**
 * Hides every difficulty label on a LeetCode problem page while the popup's
 * "Hide difficulty" switch is on, for the recognition drill. Clicking a hidden
 * label shows it.
 *
 * Labels are always marked; the switch only turns the CSS on and off, through
 * an attribute on <html>. So flipping the switch takes effect at once, with no
 * second scan of the page.
 */

import { isDifficultyLabel } from './lib/difficulty.js';

export const HIDE_KEY = 'hideDifficulty';

const MARK = 'data-lc-cheer-difficulty';
const SWITCH = 'data-lc-cheer-hide';

// font-size: 0 hides the word and its colour, and the fixed placeholder keeps
// "Easy" and "Medium" the same width, so the length gives nothing away.
const CSS = `
html[${SWITCH}] [${MARK}="hidden"] { font-size: 0 !important; cursor: pointer; }
html[${SWITCH}] [${MARK}="hidden"]::before {
  content: 'Difficulty?';
  font-size: 12px;
  color: #8a8a8a;
}
`;

/** Marks `element` if its whole text is a label. Leaves a shown label shown. */
function markIfLabel(element) {
  if (element.children.length > 0 || element.hasAttribute(MARK)) return;
  if (isDifficultyLabel(element.textContent)) element.setAttribute(MARK, 'hidden');
}

function markWithin(root) {
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  markIfLabel(root);
  for (const element of root.querySelectorAll('div, span')) markIfLabel(element);
}

function setSwitch(on) {
  document.documentElement.toggleAttribute(SWITCH, Boolean(on));
}

/** Runs `start` once <html> exists, which is not promised at document_start. */
export function startHidingDifficulty() {
  if (document.documentElement) return start();
  const waiting = new MutationObserver(() => {
    if (!document.documentElement) return;
    waiting.disconnect();
    start();
  });
  waiting.observe(document, { childList: true });
}

function start() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.documentElement.appendChild(style);

  chrome.storage.local.get(HIDE_KEY).then((stored) => setSwitch(stored[HIDE_KEY]));
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && HIDE_KEY in changes) setSwitch(changes[HIDE_KEY].newValue);
  });

  // Only the nodes that changed are scanned, because the code editor changes
  // the page on every key press.
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        // A label reused for the next problem: drop the old mark and check again.
        const element = record.target.parentElement;
        if (element) {
          element.removeAttribute(MARK);
          markIfLabel(element);
        }
      } else {
        for (const node of record.addedNodes) markWithin(node);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });

  document.addEventListener(
    'click',
    (event) => {
      const label = event.target instanceof Element && event.target.closest(`[${MARK}="hidden"]`);
      if (label) label.setAttribute(MARK, 'shown');
    },
    true,
  );
}
