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

**Never set the last number by hand.** `scripts/set-version.mjs` sets it from
git (since 21 Nov 2026, when Coin asked for version bumps a script does, not
an agent):

- The last number is the number of commits that changed the extension's
  folder, plus one while the folder has uncommitted changes.
- The first two numbers stay as written. Raise the middle one by hand for a
  feature or a new permission (0.4 → 0.5) if you want; the script keeps it.
- It writes `public/manifest.json` (or `manifest.json`), `package.json` and
  `package-lock.json`, so they always agree.

It runs in two places:

1. **Before every build.** `prebuild` and `prewatch` in each `package.json`.
   Run `npm run build` in the extension's folder before Coin reloads it, so
   `dist/` has the new number. Highlight has no real build, but
   `npm run build` there sets the version in `highlight/manifest.json`.
2. **On every commit.** `.githooks/pre-commit` sets and stages the version of
   each extension the commit changes, even when nobody ran a build.

The hook only runs after `git config core.hooksPath .githooks` in a clone.
`claude/hooks/check-tools.sh` in ai-brain warns at session start when it is
not set.

A new extension gets the same two: a `prebuild` line in its `package.json`,
and a `manifest.json` or `public/manifest.json` with a `version`.
