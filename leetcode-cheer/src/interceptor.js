/**
 * Runs in the page's own JavaScript world (manifest "world": "MAIN"), because
 * only there can it see the page's fetch and XMLHttpRequest calls. It reads
 * submission-check responses and passes each finished verdict to content.js
 * with window.postMessage. It has no access to extension APIs.
 */

import { submissionIdFromUrl, readVerdict, MESSAGE_TYPE } from './lib/check.js';

// The page polls the same check URL several times; report each submission once.
const reported = new Set();

function inspect(url, data) {
  const id = submissionIdFromUrl(url);
  if (!id || reported.has(id)) return;
  const verdict = readVerdict(data);
  if (!verdict) return; // still judging
  reported.add(id);
  window.postMessage({ type: MESSAGE_TYPE, submissionId: id, verdict }, window.location.origin);
}

const originalFetch = window.fetch;
window.fetch = function (input, init) {
  const promise = originalFetch.call(this, input, init);
  const url = typeof input === 'string' ? input : input && input.url;
  if (submissionIdFromUrl(url)) {
    promise
      .then((response) => response.clone().json())
      .then((data) => inspect(url, data))
      .catch((error) => console.warn('[leetcode-cheer] could not read a check response', error));
  }
  return promise;
};

const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  if (submissionIdFromUrl(url)) {
    this.addEventListener('load', () => {
      try {
        inspect(url, JSON.parse(this.responseText));
      } catch (error) {
        console.warn('[leetcode-cheer] could not read a check response', error);
      }
    });
  }
  return originalOpen.call(this, method, url, ...rest);
};
