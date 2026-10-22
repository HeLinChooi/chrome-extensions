// When to ask Claude whether to speak. Pure.

/**
 * - 'turn-end': Coin said something new and then paused, so he may have
 *   finished a thought or asked a question.
 * - 'long-silence': he has been quiet for a long time, and may be stuck.
 *   Asked once per silence (`nudged`).
 * Between these, nothing is sent: that is how the interviewer stays quiet.
 */
export function nextEvent({ silentMs, newSpeech, nudged, turnEndMs, longSilenceMs }) {
  if (newSpeech && silentMs >= turnEndMs) return 'turn-end';
  if (!nudged && silentMs >= longSilenceMs) return 'long-silence';
  return null;
}
