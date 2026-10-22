// The Toolkit is a Tampermonkey userscript. These are the only two Tampermonkey
// names it uses. In the MAIN world the page's window is already ours, and the
// menu command only adds an entry to Tampermonkey's menu, so it can do nothing.
window.unsafeWindow = window;
window.GM_registerMenuCommand = function () {};
