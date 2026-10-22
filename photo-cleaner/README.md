# Photo Cleaner

A Chrome extension for cleaning up a Google Photos library. It is being built
in stages. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

**Stage 1, the current state,** only loads
[Google Photos Toolkit](https://github.com/xob0t/Google-Photos-Toolkit)
(MIT, by xob0t) on photos.google.com. The Toolkit is normally installed through
Tampermonkey. This extension loads it without one, so no userscript manager
needs access to every site.

## What it can reach

- **Only `https://photos.google.com/*`.** It asks for no permissions.
- **The Toolkit sends requests only to Google.** Its two `fetch` calls go to
  `photos.google.com/.../data/batchexecute`, the page's own private API, and
  to the photo thumbnail URLs that Google returns. This was checked by
  searching the file for `fetch`, `XMLHttpRequest`, `sendBeacon`, `WebSocket`
  and `eval`. The file was not read line by line.

## Account risk

The Toolkit uses Google Photos' private, undocumented web API. Google's terms
forbid automated access that goes against robots.txt, and photos.google.com's
robots.txt blocks paths such as `/photo/` and `/trash`. Whether this tool breaks
those terms is unclear. **Test on a spare Google account first.**

## Build and load

```bash
npm run build   # copies public/, the shim and the Toolkit into dist/
npm test
```

Then in Chrome: `chrome://extensions` → **Developer mode** → **Load unpacked**
→ select `dist/`. A **GPTK** button appears on photos.google.com.

The Toolkit also puts three objects on the page, for use from the DevTools
console: `gptkApi`, `gptkApiUtils` and `gptkCore`.

## How it works

The Toolkit expects two Tampermonkey names: `unsafeWindow` and
`GM_registerMenuCommand`. Both scripts run in the page's own JavaScript
(`"world": "MAIN"` in the manifest). `src/shim.js` runs first and defines those
two names. Then the Toolkit runs unchanged.

## Updating the Toolkit

The file in `vendor/gptk/` is the v3.3.0 release, unchanged. A test checks its
SHA-256, so a replaced file fails `npm test` until the new hash is written into
`test/extension.test.js`. Before changing that hash, search the new file again
for network calls:

```bash
grep -nE 'fetch\(|XMLHttpRequest|sendBeacon|WebSocket|eval\(|new Function' \
  vendor/gptk/google_photos_toolkit.user.js
```

Each `fetch` must go only to `photos.google.com` or to a thumbnail URL.
