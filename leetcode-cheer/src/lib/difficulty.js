/**
 * Recognising LeetCode's difficulty labels. Pure.
 *
 * Matched by text, not by class name: the main label uses
 * `text-difficulty-easy`, but the "Similar Questions" list uses plain colour
 * classes such as `text-yellow`, and both change when LeetCode redesigns.
 * "Med." is the short form some problem lists use.
 */

const LABEL = /^(Easy|Medium|Med\.|Hard)$/;

/** True when an element's whole text is a difficulty label. */
export function isDifficultyLabel(text) {
  return LABEL.test(String(text ?? '').trim());
}
