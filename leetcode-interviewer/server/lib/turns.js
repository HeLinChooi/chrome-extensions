// When to ask Claude whether to speak. Pure.

/**
 * - 'turn-end': Coin said something new and then paused, so he may have
 *   finished a thought or asked a question.
 * - 'long-silence': he has been quiet for a long time, and may be stuck.
 *   Asked once per silence (`nudged`).
 * Between these, nothing is sent: that is how the interviewer stays quiet.
 *
 * silentMs is quiet by loudness: fast, but typing or room noise can stop it
 * ever growing. textQuietMs is the time since Whisper last returned words,
 * which noise does not reset.
 */
export function nextEvent({ silentMs, textQuietMs, newSpeech, nudged, turnEndMs, textTurnEndMs, longSilenceMs }) {
  if (newSpeech && (silentMs >= turnEndMs || textQuietMs >= textTurnEndMs)) return 'turn-end';
  if (!nudged && textQuietMs >= longSilenceMs) return 'long-silence';
  return null;
}
