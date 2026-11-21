#!/usr/bin/env node
// Sets a tool's version from git, so nobody has to remember to change it.
//
// A version is MAJOR.MINOR.PATCH. MAJOR.MINOR stay as written in the files:
// change them by hand for a big change. PATCH is set here, and is:
//
//   the number of commits that changed the tool's folder,
//   plus one if the folder has changes that are not committed yet,
//   because the next commit will add one more.
//
// So the same git state always gives the same version, every commit that
// touches a tool raises its version, and a build made before the commit
// already shows the number that the commit will have.
//
// Usage:
//   node set-version.mjs <folder>...           from a build script
//   node set-version.mjs --staged <folder>...  from the pre-commit hook: only
//       folders with staged changes, and the version files are staged too
//
// The same file is copied into each of Coin's repos that has a version.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Files that hold a version. The first one found in a folder is read for
// MAJOR.MINOR; every one found is written.
const VERSION_FILES = [
  'public/manifest.json', // Chrome extension with a build
  'manifest.json',        // Chrome extension without a build
  'package.json',
  'openclaw.plugin.json',
  'package-lock.json',
];

// The version line: "version": "1.2.3". "manifest_version" does not match,
// because the quote must come straight before "version".
const VERSION_LINE = /"version"(\s*:\s*)"([^"]*)"/g;

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function fail(message) {
  console.error(`set-version: ${message}`);
  process.exit(1);
}

function versionFilesIn(folder) {
  return VERSION_FILES.map((name) => join(folder, name)).filter((path) => existsSync(path));
}

function currentVersion(path) {
  const match = new RegExp(VERSION_LINE.source).exec(readFileSync(path, 'utf8'));
  if (!match) fail(`no "version" in ${path}`);
  return match[2];
}

// package-lock.json holds the version twice: at the top, and under
// packages[""]. The other files hold it once, at the top.
function writeVersion(path, version) {
  const times = path.endsWith('package-lock.json') ? 2 : 1;
  const text = readFileSync(path, 'utf8');
  let count = 0;
  const updated = text.replace(VERSION_LINE, (line, colon) => {
    count += 1;
    return count <= times ? `"version"${colon}"${version}"` : line;
  });
  if (updated !== text) writeFileSync(path, updated);
  return updated !== text;
}

function setVersion(root, folder, staged) {
  const files = versionFilesIn(folder);
  if (files.length === 0) return; // not a tool folder, such as scripts/

  const inRepo = relative(root, folder) || '.';
  const changed = staged
    ? git(['diff', '--cached', '--name-only', '--', inRepo], root) !== ''
    : git(['status', '--porcelain', '--', inRepo], root) !== '';
  if (staged && !changed) return;

  const commits = Number(git(['rev-list', '--count', 'HEAD', '--', inRepo], root));
  const patch = commits + (changed ? 1 : 0);

  const current = currentVersion(files[0]);
  const parts = current.split('.');
  if (parts.length < 2 || !parts.every((part) => /^\d+$/.test(part))) {
    fail(`${relative(root, files[0])} has version "${current}"; expected numbers like 1.2 or 1.2.3`);
  }
  const [major, minor, oldPatch = '0'] = parts;
  // Chrome and VS Code refuse an update whose version is lower, so stop
  // rather than write one.
  if (patch < Number(oldPatch)) {
    fail(`${inRepo}: the new patch ${patch} is lower than ${oldPatch} in ${relative(root, files[0])}. ` +
      'Raise MINOR by hand, for example 0.3 to 0.4, and run this again.');
  }
  const version = `${major}.${minor}.${patch}`;

  const written = files.filter((path) => writeVersion(path, version));
  if (staged) {
    // Stages the whole file. A version file with other changes that were
    // left out of this commit on purpose would be included too.
    for (const path of files) git(['add', '--', relative(root, path)], root);
  }
  if (written.length > 0) console.log(`set-version: ${inRepo} is now ${version}`);
}

const args = process.argv.slice(2);
const staged = args.includes('--staged');
const folders = args.filter((arg) => arg !== '--staged');
if (folders.length === 0) fail('name at least one folder, such as "."');

// Run git from the repo root, so a hook started anywhere sees the same paths.
const root = git(['rev-parse', '--show-toplevel'], process.cwd());
for (const folder of folders) setVersion(root, resolve(folder), staged);
