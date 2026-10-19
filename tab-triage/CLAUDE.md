# Tab Triage

What the extension does and why is in `README.md`. This file holds the one
thing an agent changing the code must not miss.

## The coach depends on the nightly snapshot

`projects/coach` (a separate git repo) reads one file a day from this
extension, to tell its evening digest which tabs have been open for days.
Since 2026-10-19. Four things are a contract with `coach/bin/coach`
(`cmd_tabs`). Change any of them only together with the coach:

| What | Here | In the coach |
|---|---|---|
| The time, 22:15 | `SNAPSHOT_TIME` in `src/background.js` | must stay before the 22:25 export, `coach/bin/nightly-export.sh` |
| The file name, `tab-triage/YYYY-MM-DD.json` | `snapshotFilename` in `src/lib/snapshot.js` | `TAB_SNAPSHOTS` in `coach/bin/coach` |
| The fields `version`, `date`, `tabs[].url`, `tabs[].title` | `buildSnapshot` | `cmd_tabs` |
| `~/Downloads/tab-triage` is a symlink to `coach/tabs/inbox` | Chrome writes through it | launchd may not read Downloads; `coach/bin/preflight.sh` checks the link |

**A test pins the fields.** `test/fixtures/snapshot-v1.json` is what
`buildSnapshot` must produce, and the coach's `tests/test_coach.py` reads the
same file. Rename a field and one of the two suites fails. If the change is
intended, bump `SNAPSHOT_VERSION`, add `snapshot-v2.json`, and update the
coach in the same session.

The `downloads` and `downloads.ui` permissions exist only for this snapshot.
`downloads.ui` hides the download bubble, so that nothing appears
each night.
