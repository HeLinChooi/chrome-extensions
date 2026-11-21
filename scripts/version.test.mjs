// Tests scripts/version.mjs in a throwaway git repo. Run: node --test scripts/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = new URL('./version.mjs', import.meta.url).pathname;

// A repo with one extension, "ext", at 0.4.2, and one plain folder, "notes".
function makeRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'version-test-'));
  const run = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8' });
  run('init', '-q');
  run('config', 'user.email', 'test@example.com');
  run('config', 'user.name', 'test');
  mkdirSync(join(dir, 'ext/public'), { recursive: true });
  mkdirSync(join(dir, 'notes'));
  writeFileSync(join(dir, 'ext/public/manifest.json'), '{\n  "manifest_version": 3,\n  "version": "0.4.2"\n}\n');
  writeFileSync(join(dir, 'ext/package.json'), '{\n  "name": "ext",\n  "version": "0.4.2"\n}\n');
  writeFileSync(join(dir, 'ext/package-lock.json'),
    '{\n  "version": "0.4.2",\n  "packages": {\n    "": {\n      "version": "0.4.2"\n    },\n    "node_modules/x": {\n      "version": "9.9.9"\n    }\n  }\n}\n');
  writeFileSync(join(dir, 'ext/a.js'), 'one\n');
  writeFileSync(join(dir, 'notes/n.txt'), 'one\n');
  run('add', '-A');
  run('commit', '-qm', 'init');
  return { dir, run };
}

function version(dir, ...args) {
  return spawnSync('node', [SCRIPT, ...args], { cwd: dir, encoding: 'utf8' });
}

function editAndStage(repo, path) {
  writeFileSync(join(repo.dir, path), 'two\n');
  repo.run('add', path);
}

function checkMessage(repo, message) {
  writeFileSync(join(repo.dir, 'MSG'), message);
  return version(repo.dir, 'check-message', 'MSG', 'ext', 'notes');
}

test('bump minor sets every version file, but not the libraries in the lock file', () => {
  const { dir } = makeRepo();
  version(dir, 'bump', 'minor', 'ext');
  const lock = readFileSync(join(dir, 'ext/package-lock.json'), 'utf8');
  assert.deepEqual(
    [readFileSync(join(dir, 'ext/public/manifest.json'), 'utf8').match(/"version": "([^"]*)"/)[1],
      readFileSync(join(dir, 'ext/package.json'), 'utf8').match(/"version": "([^"]*)"/)[1],
      lock.match(/"0\.5\.0"/g).length, lock.includes('"9.9.9"')],
    ['0.5.0', '0.5.0', 2, true]);
});

test('bump twice gives the same version, because it counts from the last commit', () => {
  const { dir } = makeRepo();
  version(dir, 'bump', 'patch', 'ext');
  version(dir, 'bump', 'patch', 'ext');
  assert.match(readFileSync(join(dir, 'ext/package.json'), 'utf8'), /"0\.4\.3"/);
});

test('bump major resets minor and patch', () => {
  const { dir } = makeRepo();
  version(dir, 'bump', 'major', 'ext');
  assert.match(readFileSync(join(dir, 'ext/package.json'), 'utf8'), /"1\.0\.0"/);
});

test('check-staged refuses a changed folder with no new version', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  assert.equal(version(repo.dir, 'check-staged', 'ext').status, 1);
});

test('check-staged accepts a changed folder after bump and git add', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  version(repo.dir, 'bump', 'patch', 'ext');
  repo.run('add', 'ext');
  assert.equal(version(repo.dir, 'check-staged', 'ext').status, 0);
});

test('check-staged refuses a bump that was not staged', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  version(repo.dir, 'bump', 'patch', 'ext');
  assert.equal(version(repo.dir, 'check-staged', 'ext').status, 1);
});

test('check-staged refuses a jump of more than one step', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  for (const file of ['ext/public/manifest.json', 'ext/package.json', 'ext/package-lock.json']) {
    const path = join(repo.dir, file);
    writeFileSync(path, readFileSync(path, 'utf8').replaceAll('"0.4.2"', '"0.4.5"'));
  }
  repo.run('add', 'ext');
  assert.equal(version(repo.dir, 'check-staged', 'ext').status, 1);
});

test('check-staged refuses version files that disagree', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  version(repo.dir, 'bump', 'patch', 'ext');
  writeFileSync(join(repo.dir, 'ext/package.json'), '{\n  "name": "ext",\n  "version": "0.4.2"\n}\n');
  repo.run('add', 'ext');
  assert.equal(version(repo.dir, 'check-staged', 'ext').status, 1);
});

test('check-staged needs no new version for a Markdown-only change', () => {
  const repo = makeRepo();
  writeFileSync(join(repo.dir, 'ext/README.md'), 'notes\n');
  repo.run('add', 'ext/README.md');
  assert.equal(version(repo.dir, 'check-staged', 'ext').status, 0);
});

test('check-staged ignores a folder with no version file', () => {
  const repo = makeRepo();
  editAndStage(repo, 'notes/n.txt');
  assert.equal(version(repo.dir, 'check-staged', 'ext', 'notes').status, 0);
});

test('check-message accepts "feat:" with a minor step', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  version(repo.dir, 'bump', 'minor', 'ext');
  repo.run('add', 'ext');
  assert.equal(checkMessage(repo, 'feat(ext): add a button\n').status, 0);
});

test('check-message refuses "fix:" with a minor step', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  version(repo.dir, 'bump', 'minor', 'ext');
  repo.run('add', 'ext');
  assert.equal(checkMessage(repo, 'fix(ext): add a button\n').status, 1);
});

test('check-message accepts "feat!:" with a major step', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  version(repo.dir, 'bump', 'major', 'ext');
  repo.run('add', 'ext');
  assert.equal(checkMessage(repo, 'feat!: remove the old setting\n').status, 0);
});

test('check-message accepts "chore:" with a patch step', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  version(repo.dir, 'bump', 'patch', 'ext');
  repo.run('add', 'ext');
  assert.equal(checkMessage(repo, 'chore: update a library\n').status, 0);
});

test('check-message refuses a message without a type', () => {
  const repo = makeRepo();
  editAndStage(repo, 'ext/a.js');
  version(repo.dir, 'bump', 'patch', 'ext');
  repo.run('add', 'ext');
  assert.equal(checkMessage(repo, 'Fix the button\n').status, 1);
});

test('check-message accepts any message when no versioned folder changed', () => {
  const repo = makeRepo();
  editAndStage(repo, 'notes/n.txt');
  assert.equal(checkMessage(repo, 'Update notes\n').status, 0);
});
