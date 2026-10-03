// Asks the background to hide this frame's site-specific ads. The background
// injects the CSS itself, as a user stylesheet that the page cannot override.
chrome.runtime.sendMessage({ type: 'cosmetic' });
