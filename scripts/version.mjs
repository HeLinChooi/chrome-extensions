#!/usr/bin/env node
// Keeps each tool's version as MAJOR.MINOR.PATCH, and makes sure every commit
// that changes a tool raises it by the step its message names:
//
//   major  something that used to work now works differently or is gone
//   minor  a new feature
//   patch  a fix, or any other change
//
// Commands:
//
//   node scripts/version.mjs bump <major|minor|patch> <folder>
//       Sets the folder's version one step above the version in the last
//       commit, in every version file. Running it twice gives the same
//       result. Run it before the build, so what Coin installs already shows
//       the new number.
//
//   node scripts/version.mjs check-staged <folder>...
//       For .githooks/pre-commit. Refuses the commit when a changed folder's
//       version is not exactly one step above the last commit's.
//
//   node scripts/version.mjs check-message <message file> <folder>...
//       For .githooks/commit-msg. Refuses the commit when its message is not
//       "type(scope): summary", or names a different step than the version:
//       "feat!:" is major, "feat:" is minor, any other type is patch.
//
// A hook that runs after the message is written cannot change the files in
// the commit (tested 21 Nov 2026). So `bump` sets the version, and the hooks
// only check it. Coin asked on 21 Nov 2026 for version bumps that a script
// enforces, not an agent's memory.
//
// The same file is copied into each of Coin's repos with a version. Edit the
// copy in chrome-extensions, run `node --test scripts/*.test.mjs`, then copy it to the
// others. ai-brain's check-tools.sh warns when a copy differs.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Files that hold a version. The first one found in a folder is the one
// compared with the last commit; all of them must agree.
const VERSION_FILES = [
  'public/manifest.json', // Chrome extension with a build
  'manifest.json',        // Chrome extension without a build
  'package.json',
  'openclaw.plugin.json',
  'version.txt',          // Jaga: the file holds only the version
  'package-lock.json',
];

// Changes to these do not reach what Coin installs, so they need no new version.
const NOT_SHIPPED = [/\.md$/, /(^|\/)\.github\//, /(^|\/)\.githooks\//, /(^|\/)\.gitignore$/];

// "version": "1.2.3". "manifest_version" does not match, because the quote
// must come straight before "version".
const VERSION_LINE = /"version"(\s*:\s*)"([^"]*)"/g;

const STEPS = ['patch', 'minor', 'major'];
const TYPES = ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'build', 'ci', 'chore', 'revert'];
const MESSAGE = new RegExp(`^(${TYPES.join('|')})(\\([^)]*\\))?(!)?: \\S`);

const root = git(['rev-parse', '--show-toplevel'], process.cwd());

function git(args, cwd = root) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

function fail(message) {
  console.error(`\nversion: ${message}\n`);
  process.exit(1);
}

function inRepo(folder) {
  return relative(root, resolve(folder)) || '.';
}

function versionFiles(folder) {
  return VERSION_FILES.map((name) => join(folder, name)).filter((path) => existsSync(join(root, path)));
}

function readVersion(text, path) {
  if (path.endsWith('version.txt')) return text.trim();
  const match = new RegExp(VERSION_LINE.source).exec(text);
  return match ? match[2] : null;
}

// The version in the last commit ("HEAD") or in the staged files (""),
// or null when the file is not there.
function versionAt(ref, path) {
  try {
    return readVersion(git(['show', `${ref}:${path}`]), path);
  } catch {
    return null;
  }
}

function parse(version, path) {
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) fail(`${path} has version "${version}"; expected MAJOR.MINOR.PATCH, such as 1.2.3`);
  return version.split('.').map(Number);
}

function next(version, step, path) {
  const [major, minor, patch] = parse(version, path);
  if (step === 'major') return `${major + 1}.0.0`;
  if (step === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

// Which step goes from `from` to `to`, or null when it is not exactly one.
function stepBetween(from, to, path) {
  for (const step of STEPS) if (next(from, step, path) === to) return step;
  return null;
}

// package-lock.json holds the version twice: at the top and under packages[""].
function writeVersion(path, version) {
  const full = join(root, path);
  if (path.endsWith('version.txt')) return writeFileSync(full, `${version}\n`);
  const times = path.endsWith('package-lock.json') ? 2 : 1;
  let count = 0;
  const text = readFileSync(full, 'utf8').replace(VERSION_LINE, (line, colon) => {
    count += 1;
    return count <= times ? `"version"${colon}"${version}"` : line;
  });
  writeFileSync(full, text);
}

// Folders whose staged changes reach what Coin installs. A folder that is new
// in this commit is left out: its first version is set by hand.
function changedFolders(folders) {
  return folders.map(inRepo).filter((folder) => {
    const files = versionFiles(folder);
    if (files.length === 0 || versionAt('HEAD', files[0]) === null) return false;
    const changed = git(['diff', '--cached', '--name-only', '--', folder]).split('\n').filter(Boolean);
    return changed.some((path) => !NOT_SHIPPED.some((pattern) => pattern.test(path)));
  });
}

function bumpCommand(folder) {
  return `node scripts/version.mjs bump <major|minor|patch> ${folder}`;
}

// The step each changed folder's staged version takes from the last commit.
function stagedSteps(folders) {
  return changedFolders(folders).map((folder) => {
    const [primary, ...others] = versionFiles(folder);
    const before = versionAt('HEAD', primary);
    const staged = versionAt('', primary);
    for (const path of others) {
      if (versionAt('', path) !== staged) {
        fail(`${path} says ${versionAt('', path)} but ${primary} says ${staged}. Run: ${bumpCommand(folder)}, then git add.`);
      }
    }
    const step = stepBetween(before, staged, primary);
    if (!step) {
      fail(`${folder} changed, but its staged version is ${staged} and the last commit's is ${before}.\n` +
        `Choose how big the change is: major (something works differently or is gone),\n` +
        `minor (a new feature) or patch (a fix or anything else). Then run:\n\n` +
        `  ${bumpCommand(folder)}\n  git add ${folder}\n\nand commit again with a message such as "feat(${folder}): ..." for minor.`);
    }
    return { folder, step };
  });
}

function bump(step, folder) {
  if (!STEPS.includes(step)) fail(`the step must be major, minor or patch, not "${step}"`);
  const files = versionFiles(inRepo(folder));
  if (files.length === 0) fail(`${inRepo(folder)} has no version file (${VERSION_FILES.join(', ')})`);
  const before = versionAt('HEAD', files[0]);
  if (before === null) fail(`${files[0]} is not in the last commit yet. Write its first version by hand, such as 0.1.0.`);
  const version = next(before, step, files[0]);
  for (const path of files) writeVersion(path, version);
  console.log(`version: ${inRepo(folder)} ${before} -> ${version} (${step})`);
}

function checkMessage(messageFile, folders) {
  // A merge commit's message is written by git, and its changes were checked
  // when they were committed on their own branch.
  try {
    git(['rev-parse', '-q', '--verify', 'MERGE_HEAD']);
    return;
  } catch {
    // not a merge
  }
  const steps = stagedSteps(folders);
  if (steps.length === 0) return;

  const text = readFileSync(messageFile, 'utf8').split('\n').filter((line) => !line.startsWith('#')).join('\n');
  const first = text.trim().split('\n')[0] ?? '';
  const match = MESSAGE.exec(first);
  if (!match) {
    fail(`the message must start with "type(scope): summary", such as "fix(${steps[0].folder}): ...".\n` +
      `Types: ${TYPES.join(', ')}. Add "!" after the type, as in "feat!:", when something works differently or is gone.`);
  }
  const named = match[3] || /^BREAKING CHANGE:/m.test(text) ? 'major' : match[1] === 'feat' ? 'minor' : 'patch';
  const biggest = steps.reduce((a, b) => (STEPS.indexOf(b.step) > STEPS.indexOf(a.step) ? b : a));
  if (named !== biggest.step) {
    const wanted = { major: '"feat!:" or "fix!:"', minor: '"feat:"', patch: '"fix:" or another type that is not feat' }[biggest.step];
    fail(`the message "${first}" names a ${named} change, but ${biggest.folder} has a ${biggest.step} version step.\n` +
      `Use ${wanted}, or change the step with: ${bumpCommand(biggest.folder)}, then git add.`);
  }
}

const [command, ...args] = process.argv.slice(2);
if (command === 'bump' && args.length === 2) bump(args[0], args[1]);
else if (command === 'check-staged' && args.length > 0) stagedSteps(args);
else if (command === 'check-message' && args.length > 1) checkMessage(args[0], args.slice(1));
else fail('usage: version.mjs bump <major|minor|patch> <folder> | check-staged <folder>... | check-message <file> <folder>...');
