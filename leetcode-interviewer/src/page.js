/**
 * Runs in the LeetCode page's own JavaScript world, where `window.monaco` is
 * visible. Once a second it reads the problem slug, language and code, and
 * posts them to content.js when any of them changed.
 *
 * Polling instead of Monaco's change events: switching language or moving to
 * another problem replaces the editor's model, and a one-second check covers
 * all of these without tracking each one.
 */

import { slugFromPath, codeEditorIndex, MESSAGE_TYPE } from './lib/page-state.js';

let last = '';

function readSnapshot() {
  const editors = window.monaco?.editor?.getEditors?.() ?? [];
  const languages = editors.map((editor) => editor.getModel()?.getLanguageId());
  const index = codeEditorIndex(languages);
  if (index === -1) return null;
  return {
    type: MESSAGE_TYPE,
    slug: slugFromPath(location.pathname) ?? '',
    language: languages[index],
    code: editors[index].getModel().getValue(),
  };
}

setInterval(() => {
  const snapshot = readSnapshot();
  if (!snapshot) return;
  const key = JSON.stringify(snapshot);
  if (key === last) return;
  last = key;
  window.postMessage(snapshot, location.origin);
}, 1000);
