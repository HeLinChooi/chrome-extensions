// Splits a stream of audio frames into utterances, at pauses. Pure.

/** Root mean square of 16-bit little-endian samples: how loud one frame is. */
export function frameLoudness(samples) {
  const count = samples.length / 2;
  let sum = 0;
  for (let i = 0; i < count; i++) sum += samples.readInt16LE(i * 2) ** 2;
  return Math.sqrt(sum / count);
}

/**
 * Feed it one loudness value per frame, in order. `push` returns
 * { start, end } (frame indices, end exclusive) when an utterance finishes,
 * otherwise null.
 *
 * - threshold: loudness at or above it is speech.
 * - minSpeechMs: shorter bursts, such as a key click, do not start an utterance.
 * - endSilenceMs: this much quiet ends an utterance.
 * - maxUtteranceMs: a longer one is cut there, so Whisper never waits for a monologue to end.
 */
export function createSplitter({ threshold, frameMs, minSpeechMs, endSilenceMs, maxUtteranceMs }) {
  const minSpeech = Math.ceil(minSpeechMs / frameMs);
  const endSilence = Math.ceil(endSilenceMs / frameMs);
  const maxLength = Math.floor(maxUtteranceMs / frameMs);

  let index = 0;
  let loudRun = 0;
  let quietRun = 0;
  let start = null;

  function push(loudness) {
    const i = index++;
    const loud = loudness >= threshold;
    loudRun = loud ? loudRun + 1 : 0;
    quietRun = loud ? 0 : quietRun + 1;

    if (start === null) {
      if (loudRun >= minSpeech) start = i - loudRun + 1;
      return null;
    }
    if (quietRun >= endSilence) {
      const utterance = { start, end: i - quietRun + 1 };
      start = null;
      return utterance;
    }
    if (i + 1 - start >= maxLength) {
      const utterance = { start, end: i + 1 };
      start = i + 1;
      return utterance;
    }
    return null;
  }

  /** Milliseconds since the last loud frame. */
  const silentMs = () => quietRun * frameMs;

  return { push, silentMs };
}
