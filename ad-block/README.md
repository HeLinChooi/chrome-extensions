# Ad Block

A Chrome extension that blocks ads, trackers and cookie banners, in the style
of Ghostery. It uses three public filter lists:

| In the popup | List | What it blocks |
|---|---|---|
| Ads | [EasyList](https://easylist.to/) | Ad requests and ad space on pages |
| Trackers | [EasyPrivacy](https://easylist.to/) | Analytics and tracking requests |
| Cookie banners | [EasyList Cookie List](https://secure.fanboy.co.nz/) | Cookie consent pop-ups |

## What it does

- **Blocks requests** to ad and tracker servers before they are sent.
- **Hides ad space** that stays on the page, such as empty ad boxes and cookie
  banners.
- **The badge shows how many requests it blocked** on the current tab.
- **The popup** splits that count into ads, trackers and cookie banners.
- **Pause on a site** if blocking breaks it, for **1 hour**, **1 day** or
  **Always**. The tab reloads with nothing blocked. The popup shows when the
  pause ends, and **Resume blocking** ends it early. Pausing `bbc.com` also
  pauses `www.bbc.com` and other subdomains.
- **A timed pause ends by itself.** An alarm wakes the extension at the end
  time and turns blocking back on. Pages already open stay unblocked until
  they are reloaded.
- **Each list can be turned off** in the popup, and so can all blocking.

## How it works

Manifest V3 does not let an extension inspect each request itself. Instead,
the extension gives Chrome a set of rules in advance, through the
`declarativeNetRequest` API, and Chrome applies them.

So the work happens at build time. `scripts/lists.mjs` downloads the lists, and
`src/lib/convert.js` converts each filter:

- **A network filter** such as `||ads.com^$third-party` becomes a rule. Its
  pattern syntax is the same in both systems. Options such as `$script` and
  `$domain=` have direct equivalents.
- **Filters that only name a domain are merged.** About 94,000 filters look
  like `||ads.com^`. Filters that share the same options become a single rule
  with a list of domains. The result is about 14,600 rules. Chrome guarantees
  each extension 30,000, and the build fails if the total is higher.
- **A cosmetic filter** such as `news.com##.promo` hides elements with CSS.
  Generic ones, for every site, go into one stylesheet per list. Chrome injects
  that stylesheet into every frame. Site-specific ones are injected by the
  background service worker, as a user stylesheet. A page's own `!important`
  rules cannot override a user stylesheet.
- **A filter Chrome cannot apply exactly is dropped.** Applying a filter with
  the wrong meaning breaks pages. This drops regular expressions, `$popup`,
  `$redirect`, `$csp`, `$removeparam`, procedural selectors like `:has-text()`,
  and scriptlets (`##+js`).

## Limits

- **YouTube video ads are not blocked.** That needs scriptlets, which run code
  inside the page. This extension does not have them.
- **The lists do not update by themselves.** They are fixed when you build. To
  update, run `npm run update-lists && npm run build`, then reload the
  extension.
- **The generic stylesheets are about 1.2 MB** and are injected into every
  frame. Pages still loaded quickly in testing, but this is the first place to
  look if pages feel slow.
- The popup's per-list count comes from `getMatchedRules`. Chrome allows that
  API only to extensions with the `declarativeNetRequestFeedback` permission,
  which is meant for unpacked extensions.

## Install

```bash
npm install
npm run build      # downloads the lists on the first run, then emits dist/
npm test
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select `dist/`. After changing code, run `npm run build` and click
the reload icon on the extension's card.

If another blocker such as Ghostery or uBlock Origin is installed, turn it off
first. Two blockers make it hard to tell which one broke a page.
