# Work Hours

A Chrome extension that shows each price on a Malaysian or Singapore shopping
site as the time it takes you to earn it. A RM49.90 mouse on Shopee gets a small
badge beside the price: **≈ 1 h 44 min of work**.

The idea comes from a Threads post by mclee (@lee_min_ch), who built an
"impulse shopping stopper" for PChome, Shopee and Momo in Taiwan:
<https://www.threads.com/t/DJcBBZvTf46>. That code was never published, so this
is a new version written for ringgit.

## What it does

- **A badge beside every price** on Shopee, Lazada and Zalora, in Malaysia
  and Singapore. The original price stays visible. The badge is added after
  it.
- **A price range gets a range:** "RM12.90 - RM20.00" shows
  "≈ 27 min – 42 min of work".
- **Crossed-out prices get no badge.** They are the old price beside a
  discount, and nobody pays them.
- **Prices that load later get a badge too**, such as more results while
  scrolling.
- **An on/off switch** at the top of the popup, "Show the hours on shop
  pages". Turning it off removes every badge from open shop tabs at once, and
  turning it on brings them back, with no reload.

## How the time is worked out

You enter these in the popup:

| Setting | Meaning | Default |
|---|---|---|
| I am paid in | Ringgit or Singapore dollars | ringgit |
| Monthly take-home pay | After EPF or CPF, and income tax: what reaches your bank account | none |
| Hours worked a week | Your normal week | 40 |
| 1 S$ is worth | Ringgit per Singapore dollar | 3.19, the rate on 21 Oct 2026 |

```
hourly pay = monthly pay ÷ (hours a week × 52 ÷ 12)
```

With RM 5,000 a month and 40 hours a week, one hour is worth RM 28.85.

**The site decides the currency of its prices.** A `.sg` site shows Singapore
dollars: `$12.90`, `S$12.90` or `SGD 12.90`. Any other site shows ringgit,
written `RM`. When the shop's currency differs from your pay, the price is
converted with the rate first. The rate is not updated by itself, so check it
now and then.

| Time | Shown as |
|---|---|
| Under 1 hour | `45 min` |
| Under 1 work day | `1 h 44 min` |
| 1 work day or more | `2.5 days`, where a day is hours a week ÷ 5 |

No badge appears until a monthly pay is entered.

## How it finds a price

Shops often put "RM" and "49.90" in separate elements. So for each piece of text
with a digit in it, the content script looks at most three elements up, for the
smallest element whose whole text is one price in the site's currency. "Free shipping above
RM50" is not a price, because it is a sentence.

## Limits

- **Only tested on a test page, not on the real shops.** Lazada asked for a
  CAPTCHA during the test, so the check stopped there. If a shop shows no
  badges, its price markup is different. Open DevTools on a price and compare
  it with "How it finds a price".
- Only these sites: `shopee.com.my`, `*.lazada.com.my`, `www.zalora.com.my`,
  `shopee.sg`, `*.lazada.sg` and `www.zalora.sg`. To add one, add it to
  `matches` in `public/manifest.json`. A site whose name does not end in
  `.sg` is read as ringgit.
- Only prices written with a currency symbol. A bare number is skipped.

## Install

```bash
npm install
npm run build      # emits dist/
npm test
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select `dist/`. Click the extension's icon and enter your pay.
Reload any shop tab that was already open.

The price parsing and the time maths are in `src/lib/price.js`. It has no
Chrome calls, so `npm test` runs it in Node.
