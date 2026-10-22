// Runs whisper-server, which keeps the model loaded, and sends it utterances.

import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { wavFile } from './lib/wav.js';

const MODEL = process.env.WHISPER_MODEL ?? join(homedir(), '.local/share/whisper/ggml-large-v3-turbo.bin');
const PORT = 8738;
const URL = `http://127.0.0.1:${PORT}`;

export async function startWhisper() {
  const child = spawn('whisper-server', ['-m', MODEL, '--host', '127.0.0.1', '--port', String(PORT), '-l', 'en'], {
    stdio: 'ignore',
  });
  child.on('exit', (code) => {
    if (code !== null && code !== 0) console.error(`whisper-server exited with code ${code}`);
  });
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(URL);
      return child;
    } catch {
      await sleep(500);
    }
  }
  child.kill();
  throw new Error(`whisper-server did not start on port ${PORT} within 30 s. Is port ${PORT} already in use?`);
}

/** Whisper writes these for silence or noise, not for speech. */
const NOT_SPEECH = /^\s*(\[[^\]]*\]|\([^)]*\))\s*$/;

/** samples: 16 kHz mono 16-bit PCM. Returns '' for silence or noise. */
export async function transcribe(samples) {
  const form = new FormData();
  form.append('file', new Blob([wavFile(samples)], { type: 'audio/wav' }), 'utterance.wav');
  form.append('response_format', 'json');
  form.append('temperature', '0');
  const response = await fetch(`${URL}/inference`, { method: 'POST', body: form });
  if (!response.ok) throw new Error(`whisper-server returned ${response.status}`);
  const text = (await response.json()).text.replace(/\s+/g, ' ').trim();
  return NOT_SPEECH.test(text) ? '' : text;
}
