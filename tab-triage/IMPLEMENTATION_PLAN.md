# Tell the coach which tabs have been open for days

Started 2026-10-19. Remove this file when every stage is complete.

The coach's evening digest (`projects/coach/prompts/evening.md`) gets a short
list of tabs open three or more days. All comparing happens in Python on the
host, so the model reads at most five short lines, and nothing on a day with no
old tabs.

## Stage 1: The extension saves a nightly snapshot
**Goal**: at 22:15 local time, save `~/Downloads/tab-triage/YYYY-MM-DD.json`
with the title and URL of every open tab. No pinned tabs, no `chrome://` pages.
The download bubble is hidden (`downloads.ui`) and the entry is erased from
Chrome's download history.
**Success Criteria**: `npm test` passes; the file appears after "Save tab
snapshot now" in the dashboard's console, with no bubble.
**Tests**: `test/snapshot.test.js`: date is local, pinned and internal tabs
dropped, filename shape, JSON shape.
**Status**: Complete

## Stage 2: `coach tabs` on the host
**Goal**: read today's snapshot, update `tabs/seen.json` (URL → first day seen),
drop URLs no longer open, write `tabs/<today>.txt` with at most five tabs open
three days or more, oldest first. No file when there are none.
**Success Criteria**: `python3 -m unittest discover -s tests` passes.
**Tests**: URL normalisation, first-seen kept across days, closed tab forgotten,
threshold, cap of five, no output file when none qualify, missing snapshot.
**Status**: Complete

## Stage 3: Wire it in
**Goal**: `nightly-export.sh` runs `coach tabs`; `prompts/evening.md` reads the
file; preflight checks the snapshot is fresh; both READMEs and the coach
`CLAUDE.md` "What runs when" table say so.
**Success Criteria**: `bin/preflight.sh` all clear; `sync-live.sh --check` clean.
**Status**: Complete

## Stage 4: Verify for real
**Status**: In Progress
**Changed 2026-10-22**: the Downloads symlink is gone. A Chrome download opened
a save dialog every night, because "Ask where to save each file" is on. The
extension (0.3.0) now sends the snapshot by native messaging to
`coach/bin/tab-snapshot-host`, which writes `tabs/inbox/<day>.json`.
**Next**: reload the extension, run `saveSnapshotNow`, see the file appear
with no dialog.
**Added**: `CLAUDE.md` here and a shared fixture,
`test/fixtures/snapshot-v1.json`, read by both test suites. Two missing nights
write a warning line for the digest.
**Goal**: one real snapshot from Chrome, one real `coach tabs` run, and the next
evening digest mentioning an old tab, or saying nothing about tabs.
