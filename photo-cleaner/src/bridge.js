// Runs in the extension's isolated world on photos.google.com. The page script
// cannot call chrome.runtime, so it posts a message here, and this passes it on
// to the background worker and posts the answer back.
window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.source !== 'photo-cleaner-page') return;
  const { id, photos } = event.data;
  chrome.runtime.sendMessage({ type: 'classify', photos }, (reply) => {
    const answer = reply ?? { ok: false, error: chrome.runtime.lastError?.message ?? 'no reply' };
    window.postMessage({ source: 'photo-cleaner-ext', id, ...answer }, window.location.origin);
  });
});
