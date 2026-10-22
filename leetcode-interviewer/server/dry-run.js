// Runs one interviewer decision on a saved recording, without the microphone
// or the extension. For checking the Claude call and tuning the prompt.
//
//   npm run dry-run -- recording.wav two-sum [code-file]
//
// It transcribes the recording as utterances, then asks Claude twice with the
// same session, to show the latency and whether the prompt cache is used.

import { readFileSync } from 'node:fs';
import { createSplitter, frameLoudness } from './lib/utterances.js';
import { fetchProblem } from './lib/problem.js';
import { startWhisper, transcribe } from './whisper.js';
import { decide } from './interviewer.js';

const [wav, slug = 'two-sum', codeFile] = process.argv.slice(2);
if (!wav) {
  console.error('Usage: npm run dry-run -- recording.wav [slug] [code-file]');
  process.exit(1);
}

const FRAME_BYTES = 960;
const samples = readFileSync(wav).subarray(44);
const splitter = createSplitter({ threshold: 400, frameMs: 30, minSpeechMs: 150, endSilenceMs: 700, maxUtteranceMs: 30000 });
const cuts = [];
for (let i = 0; i * FRAME_BYTES + FRAME_BYTES <= samples.length; i++) {
  const cut = splitter.push(frameLoudness(samples.subarray(i * FRAME_BYTES, (i + 1) * FRAME_BYTES)));
  if (cut) cuts.push(cut);
}

const whisper = await startWhisper();
try {
  const transcript = [];
  for (const { start, end } of cuts) {
    const text = await transcribe(samples.subarray(start * FRAME_BYTES, end * FRAME_BYTES));
    if (text) transcript.push({ atMs: start * 30, text });
  }
  console.log(`${transcript.length} utterances:\n${transcript.map((line) => `  ${line.text}`).join('\n')}\n`);

  const session = {
    problem: await fetchProblem(slug),
    transcript,
    interviewer: [],
    language: 'python3',
    code: codeFile ? readFileSync(codeFile, 'utf8') : '',
    hintsGiven: 0,
  };
  const endMs = samples.length / 32;
  for (const attempt of [1, 2]) {
    const decision = await decide(session, 'turn-end', endMs);
    const { input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens } = decision.usage;
    console.log(`Call ${attempt}: ${decision.ms} ms, speak=${decision.speak}, stage=${decision.stage}, hint=${decision.hintLevel}`);
    console.log(`  "${decision.message}"`);
    console.log(`  tokens: input ${input_tokens}, cache write ${cache_creation_input_tokens}, cache read ${cache_read_input_tokens}, output ${output_tokens}`);
  }
} finally {
  whisper.kill();
}
