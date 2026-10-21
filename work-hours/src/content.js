import { DEFAULT_SETTINGS, currencyForHost, parsePrice as parseAny, workLabel } from './lib/price.js';

const BADGE = 'work-hours-badge';
// A price element's whole text is one price, so anything longer is a container.
const MAX_PRICE_LENGTH = 40;
// Shops split "RM" and "49.90" into sibling spans, so the price can be a few levels up.
const MAX_LEVELS_UP = 3;
const RESCAN_DELAY_MS = 300;

let settings = DEFAULT_SETTINGS;

// shopee.sg shows Singapore dollars, shopee.com.my ringgit.
const currency = currencyForHost(location.hostname);
const parsePrice = (text) => parseAny(text, currency);

/** The smallest element above this text node whose whole text is one price. */
function priceElement(textNode) {
  let el = textNode.parentElement;
  for (let level = 0; el && level < MAX_LEVELS_UP; level++, el = el.parentElement) {
    if (el.classList.contains(BADGE)) return null;
    if (el.textContent.length > MAX_PRICE_LENGTH) return null;
    if (parsePrice(el.textContent)) return el;
  }
  return null;
}

/** The old price beside a discounted one is crossed out. It gets no badge. */
function isCrossedOut(el) {
  return el.closest('del, s, strike') !== null || getComputedStyle(el).textDecorationLine.includes('line-through');
}

/** The badge goes after the price, not inside it, so the price's own text stays a price. */
function tag(el) {
  const text = workLabel(parsePrice(el.textContent), settings);
  const next = el.nextElementSibling;
  let badge = next?.classList.contains(BADGE) ? next : null;
  if (!text) {
    badge?.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement('span');
    badge.className = BADGE;
    el.after(badge);
  }
  // Writing the same text would trigger the observer again, and loop.
  if (badge.textContent !== text) badge.textContent = text;
}

function scan() {
  // A price whose text changed, such as after choosing a variant, can leave its badge behind.
  for (const badge of document.querySelectorAll(`.${BADGE}`)) {
    const price = badge.previousElementSibling;
    if (!price || !parsePrice(price.textContent)) badge.remove();
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (/\d/.test(node.data) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const prices = new Set();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const el = priceElement(node);
    if (el && !isCrossedOut(el)) prices.add(el);
  }
  prices.forEach(tag);
}

let timer = null;
function scheduleScan() {
  clearTimeout(timer);
  timer = setTimeout(scan, RESCAN_DELAY_MS);
}

chrome.storage.onChanged.addListener((changes) => {
  if (!changes.settings) return;
  settings = { ...DEFAULT_SETTINGS, ...changes.settings.newValue };
  scan();
});

// Shops load prices after the page loads, and again while scrolling.
new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true, characterData: true });

// Content scripts are not modules, so there is no top-level await.
chrome.storage.sync.get('settings').then((stored) => {
  settings = { ...DEFAULT_SETTINGS, ...stored.settings };
  scan();
});
