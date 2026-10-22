/**
 * Runs in the page, next to the Toolkit. From the DevTools console:
 *
 *   await photoCleaner.run({ uploadedOn: '2026-10-22' })   // one upload day
 *   await photoCleaner.run({ dryRun: true })                // whole library, no album
 *
 * It sends each photo's thumbnail to Claude, prints a table of verdicts, and puts
 * the "delete" photos into a new album named "Review – <label>". It never moves
 * anything to the bin: the user reviews the album and deletes from it in Google's app.
 */

import { BATCH_SIZE, toBatches } from './lib/classify.js';

const THUMB_SIZE = '=w384-h384'; // fits within 384 × 384, about 196 image tokens

function dayOf(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
}

/** Every item in the library, optionally only those uploaded on one day. */
async function listItems(uploadedOn) {
  const items = [];
  let pageId = null;
  do {
    const page = await window.gptkApi.getItemsByUploadedDate(pageId);
    items.push(...page.items);
    pageId = page.nextPageId;
  } while (pageId);
  return uploadedOn ? items.filter((item) => dayOf(item.creationTimestamp) === uploadedOn) : items;
}

async function fetchThumb(item) {
  const response = await fetch(item.thumb + THUMB_SIZE, { credentials: 'include' });
  if (!response.ok) throw new Error(`thumbnail ${item.mediaKey}: HTTP ${response.status}`);
  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
  return { mediaType: blob.type, data: dataUrl.slice(dataUrl.indexOf(',') + 1) };
}

let nextRequestId = 0;

/** Sends one batch through the bridge to the background worker. */
function classifyBatch(photos) {
  const id = ++nextRequestId;
  return new Promise((resolve, reject) => {
    function onMessage(event) {
      if (event.source !== window || event.data?.source !== 'photo-cleaner-ext' || event.data.id !== id) return;
      window.removeEventListener('message', onMessage);
      if (event.data.ok) resolve(event.data);
      else reject(new Error(event.data.error));
    }
    window.addEventListener('message', onMessage);
    window.postMessage({ source: 'photo-cleaner-page', id, photos }, window.location.origin);
  });
}

async function run({ uploadedOn = null, dryRun = false } = {}) {
  const all = await listItems(uploadedOn);
  // Videos are skipped: a thumbnail shows one frame, which says little about the video.
  const photos = all.filter((item) => !item.duration).sort((a, b) => a.timestamp - b.timestamp);
  console.log(`[Photo Cleaner] ${photos.length} photos to check (${all.length - photos.length} videos skipped)`);

  const results = [];
  const usage = { input_tokens: 0, output_tokens: 0 };
  const batches = toBatches(photos, BATCH_SIZE);
  for (const [n, batch] of batches.entries()) {
    console.log(`[Photo Cleaner] batch ${n + 1} of ${batches.length}`);
    // One batch at a time, so the request rate stays close to a person's.
    const thumbs = await Promise.all(batch.map(fetchThumb));
    const answer = await classifyBatch(thumbs);
    usage.input_tokens += answer.usage.input_tokens;
    usage.output_tokens += answer.usage.output_tokens;
    batch.forEach((item, i) => results.push({ item, ...answer.verdicts[i] }));
  }

  const toReview = results.filter((r) => r.verdict === 'delete');
  console.table(results.map((r) => ({
    taken: new Date(r.item.timestamp).toLocaleString('en-SG'),
    verdict: r.verdict,
    reason: r.reason,
  })));
  console.log(`[Photo Cleaner] ${toReview.length} of ${results.length} marked delete.`,
    `Tokens: ${usage.input_tokens} in, ${usage.output_tokens} out.`);

  if (!dryRun && toReview.length) {
    const albumName = `Review – ${uploadedOn ?? 'all'}`;
    window.gptkCore.isProcessRunning = true; // the Toolkit's helpers do nothing without it
    try {
      await window.gptkApiUtils.addToNewAlbum(toReview.map((r) => r.item), albumName);
    } finally {
      window.gptkCore.isProcessRunning = false;
    }
    console.log(`[Photo Cleaner] Added ${toReview.length} photos to the album "${albumName}".`);
  }
  window.photoCleaner.last = results;
  return { checked: results.length, markedDelete: toReview.length, usage };
}

window.photoCleaner = { run, last: null };
