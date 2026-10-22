/**
 * The Claude request and the parsing of its answer. No Chrome or network code
 * lives here, so it can be tested in Node.
 */

/** Photos per request. Neighbours must share a request, or near-copies are missed. */
export const BATCH_SIZE = 20;

export const DEFAULT_MODEL = 'claude-haiku-5-5';

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    photos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', description: 'The photo number given before the image' },
          verdict: { type: 'string', enum: ['keep', 'delete'] },
          reason: { type: 'string', description: 'At most 10 words' },
        },
        required: ['index', 'verdict', 'reason'],
        additionalProperties: false,
      },
    },
  },
  required: ['photos'],
  additionalProperties: false,
};

export const SYSTEM_PROMPT = [
  'You help a person clean up their personal photo library.',
  'You see small thumbnails, in the order they were taken. Mark each one "keep" or "delete".',
  '',
  'Mark "delete" only when the photo is clearly not worth keeping:',
  '- badly blurred, or almost black or white;',
  '- taken by accident: a pocket, a floor, a finger over the lens;',
  '- a near-copy of a neighbouring photo that is no better (keep the best one of the group);',
  '- a screenshot, or a photo of a receipt, a form or a screen, that looks done with.',
  '',
  'Mark "keep" when in doubt. Family, friends, events and places are kept unless one of the',
  'reasons above clearly applies. A wrongly kept photo costs nothing; a wrongly deleted one',
  'is a memory lost.',
  '',
  'The reason is at most 10 words, for example "blurred" or "near-copy of photo 4, which is sharper".',
].join('\n');

/** Splits a list into consecutive groups of `size`. */
export function toBatches(items, size = BATCH_SIZE) {
  const batches = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}

/**
 * @param {Array<{mediaType: string, data: string}>} photos base64 thumbnails, in order
 * @returns the user message content: a numbered label, then the image, for each photo
 */
export function buildUserContent(photos) {
  const content = [];
  photos.forEach((photo, index) => {
    content.push({ type: 'text', text: `Photo ${index}:` });
    content.push({ type: 'image', source: { type: 'base64', media_type: photo.mediaType, data: photo.data } });
  });
  content.push({ type: 'text', text: `Judge all ${photos.length} photos.` });
  return content;
}

/**
 * Turns Claude's JSON answer into one verdict per photo, in input order.
 * A photo Claude skipped, or gave an unknown verdict, is kept.
 */
export function parseVerdicts(text, count) {
  const byIndex = new Map(JSON.parse(text).photos.map((row) => [row.index, row]));
  return Array.from({ length: count }, (_, index) => {
    const row = byIndex.get(index);
    if (!row || (row.verdict !== 'keep' && row.verdict !== 'delete')) {
      return { verdict: 'keep', reason: 'no answer from Claude' };
    }
    return { verdict: row.verdict, reason: row.reason };
  });
}
