/**
 * Runs on start.interviewing.io. While the popup's "Hide AI interviewer"
 * switch is on, it hides the chat on the right of an AI interview and lets the
 * code editor on the left take the full width.
 *
 * Deleting the chat alone is not enough, because the editor's panel has a
 * fixed width of 60%. So the CSS also sets that panel to 100%.
 *
 * The panels are found by the ids of what they hold, the editor's
 * iframe#ai_coder_pad and the chat's textarea#message_body, not by class
 * names, which change when the site is redesigned. CSS :has() finds them
 * whenever they appear, so the page needs no scanning.
 */

export const HIDE_CHAT_KEY = 'hideInterviewerChat';

const SWITCH = 'data-lc-cheer-hide-chat';

const EDITOR_PANEL = 'div:has(> iframe#ai_coder_pad)';

const CSS = `
html[${SWITCH}] ${EDITOR_PANEL} { width: 100% !important; }
html[${SWITCH}] ${EDITOR_PANEL} ~ div:has(textarea#message_body) { display: none !important; }
`;

function setSwitch(on) {
  document.documentElement.toggleAttribute(SWITCH, Boolean(on));
}

const style = document.createElement('style');
style.textContent = CSS;
document.documentElement.appendChild(style);

chrome.storage.local.get(HIDE_CHAT_KEY).then((stored) => setSwitch(stored[HIDE_CHAT_KEY]));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && HIDE_CHAT_KEY in changes) setSwitch(changes[HIDE_CHAT_KEY].newValue);
});
