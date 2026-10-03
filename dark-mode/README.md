# Dark Mode

A Chrome extension that turns every website dark. It uses the engine from
[Dark Reader](https://github.com/darkreader/darkreader) (MIT licence), through
its `darkreader` npm package.

## What it does

- **Every site is dark by default.** Dark Reader reads each page's stylesheets
  and writes a dark version of every colour. It does not simply invert the
  page, so images and videos keep their real colours.
- **A switch for the current site**, in the popup or with **Alt+Shift+A**. It
  works in both directions: it can turn one site light while the rest are
  dark, or turn one site dark while the rest are light. The choice is
  remembered for that site. Iframes follow the page they are in.
- **A switch for all other sites**, in the popup or with **Alt+Shift+D**. It
  sets the default for every site without its own choice. Turn it off to keep
  the web light and make only the sites you choose dark.
- **Brightness, contrast, sepia and grayscale** sliders. They apply to every
  site.

To change the shortcuts, open `chrome://extensions/shortcuts`.

## How it works

`src/content.js` runs in every frame of every page and calls
`DarkReader.enable()` with the theme from the settings. When the settings
change, every open tab updates at once.

Dark Reader needs to read the page's stylesheets. Many come from another
origin, such as a CDN. A content script is not allowed to read those, because
of CORS. So `setFetchMethod` sends each request to the background service
worker, which has permission to fetch any URL.

The `darkreader` package replaces `chrome.runtime.sendMessage` with its own
function. That function returns nothing, so a reply from the background would
be lost. `src/native.js` keeps Chrome's original function, and the content
script uses that.

## Limits

- A page can flash white for a moment while it loads. The content script must
  read the settings before it can apply the theme, and that read takes a few
  milliseconds.
- Some sites, such as GitHub, forbid inline scripts in their Content Security
  Policy. On those sites the console shows a CSP error from Dark Reader, and
  styles that the page adds from JavaScript may stay light. The page itself is
  still dark.
- Chrome's own pages (`chrome://…`) and the Chrome Web Store cannot be changed
  by any extension.

## Install

```bash
npm install
npm run build      # emits dist/
npm test
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select `dist/`. After changing code, run `npm run build` and click
the reload icon on the extension's card.

If the real Dark Reader extension is also installed, turn it off. Two dark
themes on one page give unpredictable colours.
