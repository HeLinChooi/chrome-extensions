# Break Reminder

A Chrome extension that tells you to take a break after 30 minutes of
continuous screen time.

## What it does

- **A notification after 30 minutes** at the screen. It stays on screen until
  you click it. It has two buttons: **Snooze 10 min** and **I took a break**.
- **The reminder repeats every 5 minutes** until you take a break.
- **The toolbar badge shows the minutes** since your last break. It turns red
  when a break is due.
- **The popup** shows the same count and has the settings.

## How it knows you took a break

It uses `chrome.idle`. This reads keyboard and mouse input from the whole Mac,
not only from Chrome. So time spent in other apps counts as screen time too.

A break is any one of these:

| What happened | Counts as a break when it lasts |
|---|---|
| No keyboard or mouse input | 5 minutes |
| The screen is locked | 5 minutes |
| The Mac slept, or Chrome was closed | 5 minutes |

After a break, the count starts again from zero.

A tab playing sound counts as screen time, even with no input. This stops a
long video from counting as a break. The cost is that music playing while you
are away also stops the break from counting. You can turn this off in the
popup.

If the extension missed a break, click **I just took a break** in the popup.

## Limits

- Chrome must be running. While it is closed, nothing is counted.
- The check runs once a minute, so a reminder can be up to a minute late.
- macOS shows the notification only if Chrome is allowed to send
  notifications: System Settings → Notifications → Google Chrome.

## Install

```bash
npm install
npm run build      # emits dist/
npm test
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load
unpacked** → select `dist/`. After changing code, run `npm run build` and click
the reload icon on the extension's card.

The logic that decides when to remind is in `src/lib/timer.js`. It has no
Chrome calls, so `npm test` runs it in Node.
