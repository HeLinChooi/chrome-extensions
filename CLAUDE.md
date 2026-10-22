# chrome-extensions

Each folder is a separate Chrome extension. The README lists them.

The repo is public. `leetcode-interviewer/` also has a local server
(`server/`) that records Coin's voice and will hold a Claude API key. Keep
recordings, transcripts and keys out of the repo: recordings go in the
ignored `server/recordings/`, scorecards go to the knowledge-base repo, and
the key stays in a file outside the repo.

## Versions

Bump an extension's version on every fix or change, before Coin reloads it.
Coin asked for this on 21 Oct 2026. `chrome://extensions` shows the version,
so the number is how he tells which build is running. Reloading loads new code
even when the number is unchanged, so without a bump nothing on screen says
the reload took.

Patch for a fix (0.1.0 → 0.1.1). Minor for a feature or a new permission
(0.1.1 → 0.2.0).

In a folder with a build (all except Highlight), three places must agree:

```bash
npm version X.Y.Z --no-git-tag-version   # package.json and package-lock.json
# then edit "version" in public/manifest.json by hand
npm run build                            # copies the manifest into dist/
```

Highlight has no build: edit `version` in `highlight/manifest.json`.
