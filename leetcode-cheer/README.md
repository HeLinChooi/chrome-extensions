# LeetCode Cheer

A Chrome extension that celebrates when a LeetCode submission is accepted, and
keeps score so that solving problems feels like progress.

## What happens on "Accepted"

- **Confetti sized to the problem.** Easy gets one burst, Medium gets side
  cannons, Hard gets three seconds of fireworks.
- **Gold confetti for a first try**: accepted with no failed submission on that
  problem today. It earns 1.5× XP, which rewards thinking before submitting.
- **A card** in the corner with the XP earned, the streak, today's count against
  the daily goal, the runtime percentile, and progress to the next level.
- **A second wave of fireworks** when the solve reaches the daily goal or a new
  level.

## Scoring

| | XP |
|---|---|
| Easy / Medium / Hard | 10 / 25 / 50 |
| First try | ×1.5 |
| Solved again after 7 days or more (review) | ×0.5 |
| Solved again within 7 days | 0, with a small burst of confetti |

Every 100 XP is a level. The streak counts days with at least one solve that
earned XP. The daily goal is 2 by default and can be changed in the popup.

## How it detects "Accepted"

After **Submit**, the LeetCode page asks
`/submissions/detail/<id>/check/` (or `/v2/check/`) for the result until the
judge finishes. `src/interceptor.js` runs in the page's own JavaScript world,
watches those responses, and treats `status_code: 10` as accepted. **Run** uses
an id like `runcode_…`, which is not a number, so test runs never count.

The difficulty comes from LeetCode's public GraphQL API, requested without
cookies. If that request fails, the solve is scored as Medium.

Every verdict is logged to the page console as `[leetcode-cheer] <slug> <status>`,
which is the quickest way to check detection after LeetCode changes its site.

Progress is stored in `chrome.storage.local` on this machine only.

## Install

```bash
npm install
npm run build      # emits dist/
npm test
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select `dist/`. After changing code, run `npm run build` and click
the reload icon on the extension's card.

**Preview the celebration** in the popup has Easy, Medium and Hard buttons. Each
plays that difficulty's celebration on the open LeetCode problem page without
changing your score.
