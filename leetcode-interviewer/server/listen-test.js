// Stage 1: is local Whisper fast and accurate enough on Coin's voice?
//
//   npm run listen-test              record from the microphone, then measure
//   npm run listen-test -- a.wav     measure an existing 16 kHz mono WAV
//
// Each recording is transcribed twice: once plain, and once with a prompt of
// interview terms, to see whether the prompt reduces wrong words.

import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wordErrors } from './lib/word-errors.js';

const here = dirname(fileURLToPath(import.meta.url));
const MODEL = process.env.WHISPER_MODEL ?? join(homedir(), '.local/share/whisper/ggml-large-v3-turbo.bin');
const MIC = process.env.MIC ?? ':0';
const PROMPT =
  'A coding interview. Two pointers, sliding window, hash map, complement, ' +
  'indices, brute force, O(n log n), O(n^2), left pointer, LeetCode.';

const passage = readFileSync(join(here, 'passage.txt'), 'utf8').trim();

function record(path) {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'avfoundation', '-i', MIC, '-ac', '1', '-ar', '16000', path]);
    ffmpeg.on('error', reject);
    ffmpeg.on('exit', (code) => (code === 0 || code === 255 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    console.log('\nRecording. Read the passage below out loud, then press Enter.\n');
    console.log(passage, '\n');
    process.stdin.once('data', () => ffmpeg.stdin.write('q'));
  });
}

function transcribe(path, prompt) {
  const args = ['-m', MODEL, '-f', path, '-l', 'en', '-nt', '-np'];
  if (prompt) args.push('--prompt', prompt);
  const start = performance.now();
  const text = execFileSync('whisper-cli', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  return { text, seconds: (performance.now() - start) / 1000 };
}

let wav = process.argv[2];
if (!wav) {
  const dir = join(here, 'recordings');
  mkdirSync(dir, { recursive: true });
  wav = join(dir, `passage-${new Date().toISOString().replace(/[:.]/g, '-')}.wav`);
  await record(wav);
  process.stdin.pause();
}

// A 16 kHz mono 16-bit WAV is 32,000 bytes a second, after a 44-byte header.
const audioSeconds = (statSync(wav).size - 44) / 32000;
console.log(`Audio: ${audioSeconds.toFixed(1)} s  (${wav})\n`);

for (const [label, prompt] of [['plain', null], ['with prompt', PROMPT]]) {
  const { text, seconds } = transcribe(wav, prompt);
  const { errors, rate, mistakes } = wordErrors(passage, text);
  console.log(`--- ${label}: ${seconds.toFixed(1)} s to transcribe, ` +
    `${errors} wrong words (${(rate * 100).toFixed(1)}%)`);
  console.log(text);
  for (const { expected, heard } of mistakes) {
    console.log(`  expected ${expected ?? '(nothing)'}  heard ${heard ?? '(nothing)'}`);
  }
  console.log();
  writeFileSync(wav.replace(/\.wav$/, `.${label.replace(' ', '-')}.txt`), text + '\n');
}
