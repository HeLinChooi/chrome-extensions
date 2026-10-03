import { sendMessage } from './native.js';
import { enable, disable, setFetchMethod } from 'darkreader';
import { withDefaults, frameSite, isDarkFor, themeOf } from './lib/settings.js';

const site = frameSite(location);

/**
 * A content script cannot read a stylesheet from another origin, because of
 * CORS. Dark Reader needs those stylesheets to recolour them, so the
 * background fetches them instead.
 */
setFetchMethod(async (url) => {
  const reply = await sendMessage({ type: 'fetch', url });
  if (!reply || reply.error) throw new Error(`dark-mode could not fetch ${url}: ${reply?.error ?? 'no reply'}`);
  const bytes = Uint8Array.from(atob(reply.base64), (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { 'content-type': reply.contentType } });
});

function apply(settings) {
  if (isDarkFor(settings, site)) enable(themeOf(settings));
  else disable();
}

chrome.storage.local.get('settings').then(({ settings }) => apply(withDefaults(settings)));

chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) apply(withDefaults(changes.settings.newValue));
});
