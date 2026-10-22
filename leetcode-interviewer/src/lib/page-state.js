/**
 * Reading the open LeetCode problem and the code in its editor. Pure.
 */

/** page.js posts snapshots to content.js under this message type. */
export const MESSAGE_TYPE = 'leetcode-interviewer:snapshot';

/** "/problems/two-sum/description/" -> "two-sum". Null when not on a problem. */
export function slugFromPath(path) {
  const match = String(path || '').match(/^\/problems\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * Which Monaco editor holds the solution, given each editor's language id.
 * LeetCode also has a plain-text editor for custom test cases.
 * @returns {number} -1 while the code editor has not loaded.
 */
export function codeEditorIndex(languageIds) {
  return languageIds.findIndex((id) => id && id !== 'plaintext');
}

/**
 * Any script on the page can post window messages, so check the shape.
 * @returns {null | {slug: string, language: string, code: string}}
 */
export function readSnapshotMessage(data) {
  if (!data || data.type !== MESSAGE_TYPE) return null;
  const { slug, language, code } = data;
  if (typeof slug !== 'string' || typeof language !== 'string' || typeof code !== 'string') return null;
  return { slug, language, code };
}
