// What Whisper returned, with anything that is not speech removed. Pure.

/** Whisper writes these for noise: "[BLANK_AUDIO]", "(music)", "*crunch*". */
const SOUND_LABEL = /^\s*(\[[^\]]*\]|\([^)]*\)|\*[^*]*\*)\s*$/;

/** Returns '' when the text is not speech. */
export function speechText(text) {
  const tidy = text.replace(/\s+/g, ' ').trim();
  if (SOUND_LABEL.test(tidy) || !/[\p{L}\p{N}]/u.test(tidy)) return '';
  return tidy;
}
