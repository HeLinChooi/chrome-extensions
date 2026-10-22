# Photo Cleaner

A Chrome extension for cleaning up a Google Photos library. It is being built
in stages. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md).

It loads [Google Photos Toolkit](https://github.com/xob0t/Google-Photos-Toolkit)
(MIT, by xob0t) on photos.google.com. The Toolkit is normally installed through
Tampermonkey. This extension loads it without one, so no userscript manager
needs access to every site.

On top of the Toolkit, it sends each photo's thumbnail to Claude, which marks it
"keep" or "delete" with a short reason. The "delete" photos go into a new album
named "Review – <day>". **Nothing is moved to the bin.** You open the album in
the Google Photos app, take out what you want to keep, and delete the rest from
there.

## Use

1. Open the extension's options page and paste an Anthropic API key. The model
   defaults to `claude-haiku-5-5`.
2. On photos.google.com, open the DevTools console (Cmd+Option+J):

   ```js
   await photoCleaner.run({ uploadedOn: '2026-10-22', dryRun: true })  // table only
   await photoCleaner.run({ uploadedOn: '2026-10-22' })                // also makes the album
   ```

   Without `uploadedOn` it checks the whole library. Videos are skipped.

A thumbnail fits within 384 × 384 pixels, about 196 input tokens. Photos go in
batches of 20, one batch at a time, so neighbouring near-copies are seen together.

## What it can reach

- **Content scripts only on `https://photos.google.com/*`.** The only other
  site it can reach is `api.anthropic.com`, from the background worker.
- **The API key stays in the background worker.** The page scripts send
  thumbnails through `bridge.js`, which runs in the extension's isolated world,
  and get back only verdicts and token counts.
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
npm install
npm run build   # bundles the scripts, copies public/, the shim and the Toolkit into dist/
npm test
```

Then in Chrome: `chrome://extensions` → **Developer mode** → **Load unpacked**
→ select `dist/`. A **GPTK** button appears on photos.google.com.

The Toolkit also puts three objects on the page, for use from the DevTools
console: `gptkApi`, `gptkApiUtils` and `gptkCore`.

## How it works

The Toolkit expects two Tampermonkey names: `unsafeWindow` and
`GM_registerMenuCommand`. The shim, the Toolkit and `cleaner.js` run in the
page's own JavaScript (`"world": "MAIN"` in the manifest). `src/shim.js` runs
first and defines those two names. Then the Toolkit runs unchanged.

Every `gptkApiUtils` helper quietly does nothing unless
`gptkCore.isProcessRunning` is `true`. The GPTK button sets it. `cleaner.js`
sets it around its own calls, and so must any console code.

```
page (MAIN world)         bridge.js (isolated)       background.js
cleaner.js  --postMessage-->  relays  --sendMessage-->  API key + Claude call
            <--postMessage--          <--reply--------  verdicts + usage
```

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
