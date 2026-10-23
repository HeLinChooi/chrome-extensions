// The local server: microphone -> Whisper -> Claude -> side panel.
//
//   npm start
//
// It listens only on 127.0.0.1, and answers only requests from a Chrome
// extension (lib/origin.js). The microphone is recorded only between Start
// and Stop in the panel.

import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTrustedRequest } from './lib/origin.js';
import { nextEvent } from './lib/turns.js';
import { fetchProblem } from './lib/problem.js';
import { startWhisper, transcribe } from './whisper.js';
import { startMic } from './mic.js';
import { decide, MODEL } from './interviewer.js';

const PORT = 8737;
const TURNS = { turnEndMs: 2500, textTurnEndMs: 5000, longSilenceMs: 60000 };
const SESSIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'recordings', 'sessions');

const whisper = await startWhisper();
const listeners = new Set();
let session = null;
let mic = null;

function eventText(type, data) {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function send(type, data) {
  for (const response of listeners) response.write(eventText(type, data));
}

// Every status names the problem, so panels on other tabs can say which one is running.
function status(state) {
  return session ? { state, slug: session.slug, title: session.problem.title } : { state: 'stopped' };
}

function sendStatus(state) {
  send('status', status(state));
}

function elapsedMs() {
  return Date.now() - session.startedAt;
}

async function onUtterance(samples, startMs) {
  const current = session;
  if (!current) return;
  current.pendingTranscripts++;
  try {
    const sentAt = Date.now();
    const text = await transcribe(samples);
    // Every piece, with or without words, so a session shows what the microphone sent.
    current.pieces.push({ atMs: startMs, lengthMs: samples.length / 32, transcribeMs: Date.now() - sentAt, text });
    if (!text) return;
    current.lastTextAt = Date.now();
    // The mic starts with the session, so its clock and the session's agree.
    const line = { atMs: startMs, text };
    current.transcript.push(line);
    current.newSpeech = true;
    current.nudged = false;
    send('heard', line);
  } catch (error) {
    console.error('transcription failed:', error.message);
    send('error', { message: `Transcription failed: ${error.message}` });
  } finally {
    current.pendingTranscripts--;
  }
}

async function tick() {
  const current = session;
  if (!current || current.calling || current.pendingTranscripts > 0) return;
  const event = nextEvent({
    ...TURNS,
    silentMs: mic.silentMs(),
    textQuietMs: Date.now() - current.lastTextAt,
    newSpeech: current.newSpeech,
    nudged: current.nudged,
  });
  if (!event) return;

  current.calling = true;
  current.newSpeech = false;
  if (event === 'long-silence') current.nudged = true;
  sendStatus('thinking');
  try {
    const atMs = elapsedMs();
    const decision = await decide(current, event, atMs);
    current.decisions.push({ atMs, event, ...decision });
    console.log(`${event}: ${decision.speak ? `"${decision.message}"` : '(quiet)'} ` +
      `[${decision.stage}, ${decision.ms} ms, in ${decision.usage.input_tokens} ` +
      `+ cached ${decision.usage.cache_read_input_tokens}, out ${decision.usage.output_tokens}]`);
    if (decision.speak && session === current) {
      const line = { atMs, text: decision.message };
      current.interviewer.push(line);
      if (decision.hintLevel > 0) current.hintsGiven++;
      send('interviewer', { ...line, hintLevel: decision.hintLevel });
    }
    send('stage', { stage: decision.stage });
  } catch (error) {
    console.error('Claude call failed:', error.message);
    send('error', { message: `Interviewer failed: ${error.message}` });
  } finally {
    current.calling = false;
    if (session === current) sendStatus('listening');
  }
}

async function start({ slug, language, code }) {
  const problem = await fetchProblem(slug);
  session = {
    slug, problem, language, code,
    startedAt: Date.now(),
    lastTextAt: Date.now(),
    transcript: [], interviewer: [], decisions: [], pieces: [],
    hintsGiven: 0, newSpeech: false, nudged: false,
    pendingTranscripts: 0, calling: false,
  };
  mic = startMic(onUtterance);
  sendStatus('listening');
}

function stop() {
  if (!session) return null;
  mic.stop();
  mic = null;
  mkdirSync(SESSIONS_DIR, { recursive: true });
  const file = join(SESSIONS_DIR, `${new Date(session.startedAt).toISOString().replace(/[:.]/g, '-')}-${session.slug}.json`);
  const { pendingTranscripts, calling, newSpeech, nudged, lastTextAt, ...record } = session;
  writeFileSync(file, JSON.stringify({ model: MODEL, endedAtMs: elapsedMs(), ...record }, null, 2));
  session = null;
  sendStatus('stopped');
  return file;
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return JSON.parse(body || '{}');
}

const server = createServer(async (request, response) => {
  // The Host check stops DNS rebinding: a website whose domain resolves to 127.0.0.1.
  if (request.headers.host !== `127.0.0.1:${PORT}` || !isTrustedRequest(request.method, request.headers.origin)) {
    response.writeHead(403).end();
    return;
  }
  if (request.headers.origin) response.setHeader('Access-Control-Allow-Origin', request.headers.origin);
  try {
    if (request.method === 'GET' && request.url === '/events') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      response.write(eventText('status', status(session?.calling ? 'thinking' : 'listening')));
      listeners.add(response);
      request.on('close', () => listeners.delete(response));
      return;
    }
    if (request.method === 'POST' && request.url === '/start') {
      if (session) {
        response.writeHead(409, { 'Content-Type': 'application/json' })
          .end(JSON.stringify({ error: `an interview is already running on ${session.problem.title}` }));
        return;
      }
      await start(await readJson(request));
      response.writeHead(204).end();
      return;
    }
    if (request.method === 'POST' && request.url === '/stop') {
      const file = stop();
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ file }));
      return;
    }
    if (request.method === 'POST' && request.url === '/snapshot') {
      const { slug, language, code } = await readJson(request);
      if (session && slug === session.slug) Object.assign(session, { language, code });
      response.writeHead(204).end();
      return;
    }
    response.writeHead(404).end();
  } catch (error) {
    console.error(error);
    response.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`Interviewer server on http://127.0.0.1:${PORT}, model ${MODEL}`));
setInterval(tick, 250);

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    const file = stop();
    if (file) console.log(`Session saved to ${file}`);
    whisper.kill();
    process.exit(0);
  });
}
