# Tab Triage

What the extension does and why is in `README.md`. This file holds the one
thing an agent changing the code must not miss.

## The coach depends on the nightly snapshot

`projects/coach` (a separate git repo) reads one file a day from this
extension, to tell its evening digest which tabs have been open for days.
Since 2026-10-19. Five things are a contract with the coach
(`cmd_tabs`). Change any of them only together with the coach:

| What | Here | In the coach |
|---|---|---|
| The time, 22:15 | `SNAPSHOT_TIME` in `src/background.js` | must stay before the 22:25 export, `coach/bin/nightly-export.sh` |
| The host name, `com.coach.tab_snapshot` | `SNAPSHOT_HOST` in `src/background.js` | `coach/bin/install-tab-host.sh` |
| The file name, `<date>.json`, from the snapshot's `date` | — | `coach/bin/tab-snapshot-host` writes it; `TAB_SNAPSHOTS` in `coach/bin/coach` reads it |
| The fields `version`, `date`, `tabs[].url`, `tabs[].title` | `buildSnapshot` | `cmd_tabs` |
| This extension's ID, `kppagpbncchmehhonbjpnbjmiffplmkb` | made from the unpacked folder's path | `allowed_origins`, written by `coach/bin/install-tab-host.sh`; `coach/bin/preflight.sh` checks the host is registered |

**A test pins the fields.** `test/fixtures/snapshot-v1.json` is what
`buildSnapshot` must produce, and the coach's `tests/test_coach.py` reads the
same file. Rename a field and one of the two suites fails. If the change is
intended, bump `SNAPSHOT_VERSION`, add `snapshot-v2.json`, and update the
coach in the same session.

The `nativeMessaging` permission exists only for this snapshot. **Do not go
back to `chrome.downloads`.** Coin keeps Chrome's "Ask where to save each file"
on, and a download then opens a save dialog every night (found 2026-10-22).

## Versions

Bump the version on every change that will be reloaded, so `chrome://extensions`
shows which build is running. Reloading loads new code even when the number
is unchanged, so without a bump nothing on screen says the reload took.
Three places must agree: `public/manifest.json`, `package.json` and
`package-lock.json`. `npm version X.Y.Z --no-git-tag-version` updates the last
two; edit the manifest by hand. Minor for a feature or a new permission, patch
for a fix.
