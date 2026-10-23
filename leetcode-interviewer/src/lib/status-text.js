/**
 * The text beside the buttons. Pure.
 * @param {{state: string, slug?: string, title?: string}} status from the server
 * @param {string | null} activeSlug the problem in the tab the panel is showing
 */
export function statusText({ state, slug, title }, activeSlug) {
  if (state === 'stopped') return '';
  // Only one interview runs at a time, so other tabs say which problem it is on.
  if (slug !== activeSlug) return `Interview running on ${title}`;
  return state === 'thinking' ? 'Interviewer is thinking…' : 'Listening';
}
