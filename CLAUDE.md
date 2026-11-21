# chrome-extensions

Each folder is a separate Chrome extension. The README lists them.

The repo is public. `leetcode-interviewer/` also has a local server
(`server/`) that records Coin's voice and will hold a Claude API key. Keep
recordings, transcripts and keys out of the repo: recordings go in the
ignored `server/recordings/`, scorecards go to the knowledge-base repo, and
the key stays in a file outside the repo.

## Versions

Every change raises an extension's version. `chrome://extensions` shows the
version, so the number is how Coin tells which build is running. Reloading
loads new code even when the number is unchanged, so without a new number
nothing on screen says the reload took.

Versions are MAJOR.MINOR.PATCH. Choose the step from what changed:

- **major**: something that used to work now works differently or is gone
- **minor**: a new feature
- **patch**: a fix, or any other change

**Before building, set the version with the script, never by hand:**

```bash
node scripts/version.mjs bump <major|minor|patch> <extension folder>
npm run build      # in the extension's folder; copies the manifest into dist/
```

`bump` counts from the version in the last commit, so running it twice gives
the same number. It writes `public/manifest.json` (or `manifest.json` for
Highlight), `package.json` and `package-lock.json`, so they always agree.

**Commit with a Conventional Commits message** whose type names the same
step: `feat!:` (or any type with `!`) for major, `feat:` for minor, and
`fix:`, `chore:`, `refactor:` and the like for patch. Put the folder in the
scope: `feat(tab-triage): group tabs by site`.

Two git hooks refuse a commit that breaks this (since 21 Nov 2026, when Coin
asked for version rules a script enforces, not an agent's memory):

- `.githooks/pre-commit`: an extension folder changed, but its staged version
  is not exactly one step above the last commit's.
- `.githooks/commit-msg`: the message has no type, or names a different step.

A Markdown-only change needs no new version. The hooks only run after
`git config core.hooksPath .githooks` in a clone; `claude/hooks/check-tools.sh`
in ai-brain warns at session start when it is not set.

`scripts/version.mjs` is the main copy. file-viewers, coach and jaga hold
copies. To change it: edit it here, run `node --test scripts/*.test.mjs`,
then copy it to the other three. check-tools.sh warns when a copy differs.

A new extension needs a `version` in `manifest.json` or `public/manifest.json`.
Write its first version by hand, such as 0.1.0.
