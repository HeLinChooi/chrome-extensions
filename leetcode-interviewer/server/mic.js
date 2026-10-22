// Records the Mac's microphone with ffmpeg and cuts it into utterances.

import { spawn } from 'node:child_process';
import { createSplitter, frameLoudness } from './lib/utterances.js';

const FRAME_MS = 30;
const FRAME_BYTES = (16000 * 2 * FRAME_MS) / 1000;
/** Audio kept from before speech was detected, so the first syllable is not cut off. */
const PRE_ROLL_FRAMES = 10;
const MAX_UTTERANCE_MS = 30000;

// Threshold from Coin's recording on 22 Oct 2026: background was about 100
// to 150, speech mostly above 1000. 700 ms of quiet splits at his sentence
// breaks; 1000 ms did not split his reading at all.
const SPLIT = { threshold: 400, frameMs: FRAME_MS, minSpeechMs: 150, endSilenceMs: 700, maxUtteranceMs: MAX_UTTERANCE_MS };

/**
 * onUtterance(samples, startMs) is called for each utterance; startMs counts
 * from when recording started.
 */
export function startMic(onUtterance, device = process.env.MIC ?? ':0') {
  const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'avfoundation', '-i', device,
    '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], { stdio: ['ignore', 'pipe', 'inherit'] });
  const splitter = createSplitter(SPLIT);

  // Recent frames. An utterance never starts more than MAX_UTTERANCE_MS ago,
  // so older frames are dropped.
  const keep = MAX_UTTERANCE_MS / FRAME_MS + PRE_ROLL_FRAMES + 10;
  let frames = [];
  let firstIndex = 0;
  let pending = Buffer.alloc(0);

  ffmpeg.stdout.on('data', (chunk) => {
    pending = Buffer.concat([pending, chunk]);
    while (pending.length >= FRAME_BYTES) {
      const frame = pending.subarray(0, FRAME_BYTES);
      pending = pending.subarray(FRAME_BYTES);
      frames.push(frame);
      const utterance = splitter.push(frameLoudness(frame));
      if (utterance) {
        const from = Math.max(utterance.start - PRE_ROLL_FRAMES, firstIndex);
        const samples = Buffer.concat(frames.slice(from - firstIndex, utterance.end - firstIndex));
        onUtterance(samples, from * FRAME_MS);
      }
      if (frames.length > keep) {
        firstIndex += frames.length - keep;
        frames = frames.slice(-keep);
      }
    }
  });

  return {
    silentMs: splitter.silentMs,
    stop: () => ffmpeg.kill('SIGINT'),
    process: ffmpeg,
  };
}
