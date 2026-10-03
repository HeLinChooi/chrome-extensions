/**
 * Chrome's own sendMessage, saved before the darkreader package loads.
 * That package replaces chrome.runtime.sendMessage with a wrapper that
 * returns nothing, so a reply from the background would be lost.
 * content.js imports this module first so that it runs first.
 */
export const sendMessage = chrome.runtime.sendMessage.bind(chrome.runtime);
