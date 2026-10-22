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
          better: { type: 'integer', description: 'For a deleted near-copy, the number of the photo kept instead; otherwise -1' },
        },
        required: ['index', 'verdict', 'reason', 'better'],
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
  '- taken by accident: a pocket, a floor, a finger over the lens, upside down;',
  '- a near-copy that the rules below allow to go;',
  '- a screenshot, or a photo of a receipt, a form or a screen, that looks done with.',
  '',
  'Near-copies are photos of the same people, pose and framing, taken moments apart.',
  '- In a group of 2 or 3, delete one only if another in the group is clearly better:',
  '  sharper, eyes open, nobody blocking a face. If they are about equally good, keep them all.',
  '- In a group of 4 or more, keep the best 2 and delete the rest.',
  'For a deleted near-copy, set "better" to the number of the photo kept instead.',
  'Otherwise set "better" to -1.',
  '',
  'Mark "keep" when in doubt. Family, friends, events and places are kept unless one of the',
  'reasons above clearly applies. A wrongly kept photo costs nothing; a wrongly deleted one',
  'is a memory lost.',
  '',
  'The reason is at most 10 words and never names a photo number, because the person',
  'cannot see the numbers. For example: "blurred", or "near-copy; the other one is sharper".',
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
 * `better` is the index of the photo kept instead, or -1 when there is none.
 */
export function parseVerdicts(text, count) {
  const byIndex = new Map(JSON.parse(text).photos.map((row) => [row.index, row]));
  return Array.from({ length: count }, (_, index) => {
    const row = byIndex.get(index);
    if (!row || (row.verdict !== 'keep' && row.verdict !== 'delete')) {
      return { verdict: 'keep', reason: 'no answer from Claude', better: -1 };
    }
    const better = Number.isInteger(row.better) && row.better >= 0 && row.better < count && row.better !== index
      ? row.better
      : -1;
    return { verdict: row.verdict, reason: row.reason, better };
  });
}
