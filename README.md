# Chrome extensions

Chrome extensions I built for my own use. Each folder is a separate extension
with its own build, tests and README.

| Extension | What it does |
|---|---|
| [Tab Triage](tab-triage/) | Estimates how long it would take to clear your open tabs, groups them by site and task, and sends a morning summary. Estimates come from local rules, or from Claude with your own API key. |
| [Ad Block](ad-block/) | Blocks ads, trackers and cookie banners, in the style of Ghostery. EasyList, EasyPrivacy and the EasyList Cookie List are converted to Chrome's `declarativeNetRequest` rules at build time. A site can be paused for 1 hour, 1 day or always. |
| [Dark Mode](dark-mode/) | Turns websites dark with the Dark Reader engine. Each site can be dark or light by its own choice. |
| [LeetCode Cheer](leetcode-cheer/) | Confetti, XP, streaks and a daily goal when a LeetCode submission is accepted. |
| [Break Reminder](break-reminder/) | Reminds you to take a break after 30 minutes of screen time, measured from keyboard and mouse input across the whole computer. |
| [Highlight](highlight/) | Highlights selected text in yellow with Cmd+click (Ctrl+click on Windows). Highlights are saved per page and come back when you revisit it. |

## Shared setup

All of them use Manifest V3 and plain JavaScript. All except Highlight also use
esbuild and `node --test`. In any of those folders:

```bash
npm install
npm run build      # emits dist/
npm test
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select that folder's `dist/`.

Highlight has no build step. Load the `highlight/` folder itself.

## History

Tab Triage, LeetCode Cheer and Highlight started as their own repositories.
Their commit history was moved into this repository, so `git log -- tab-triage`
shows the full history of one extension.
