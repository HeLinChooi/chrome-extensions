/**
 * Holds the API key and calls Claude. The Google Photos page never sees the key:
 * it only sends thumbnails through the bridge and gets verdicts back.
 */

import Anthropic from '@anthropic-ai/sdk';
import { RESPONSE_SCHEMA, SYSTEM_PROMPT, DEFAULT_MODEL, buildUserContent, parseVerdicts } from './lib/classify.js';

async function classify(photos) {
  const { apiKey, model } = await chrome.storage.local.get(['apiKey', 'model']);
  if (!apiKey) throw new Error('No API key. Set one on the extension options page.');

  const client = new Anthropic({
    apiKey,
    // The service worker counts as a browser origin. Like Tab Triage, this sends
    // the user's own key directly, by their choice, and the API needs this flag.
    dangerouslyAllowBrowser: true,
  });

  const response = await client.messages.create({
    model: model || DEFAULT_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
    messages: [{ role: 'user', content: buildUserContent(photos) }],
  });

  if (response.stop_reason !== 'end_turn') {
    throw new Error(`Claude stopped with "${response.stop_reason}", so this batch was skipped.`);
  }
  const text = response.content.filter((block) => block.type === 'text').map((block) => block.text).join('');
  return { verdicts: parseVerdicts(text, photos.length), usage: response.usage };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'classify' || !sender.url?.startsWith('https://photos.google.com/')) return false;
  classify(message.photos).then(
    (result) => sendResponse({ ok: true, ...result }),
    (error) => sendResponse({ ok: false, error: error.message }),
  );
  return true; // the answer is sent later
});
