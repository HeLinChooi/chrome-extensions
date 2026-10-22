/**
 * The side panel. It shows the open problem, starts and stops an interview
 * on the local server, sends the server each code snapshot, and shows what
 * the interviewer says and what Whisper heard.
 */

const SERVER = 'http://127.0.0.1:8737';

const titleEl = document.getElementById('title');
const metaEl = document.getElementById('meta');
const startEl = document.getElementById('start');
const stopEl = document.getElementById('stop');
const statusEl = document.getElementById('status');
const conversationEl = document.getElementById('conversation');
const codeEl = document.getElementById('code');

/** The tab the panel is showing; snapshots from other tabs are ignored. */
let tabId = null;
let snapshot = null;
let running = false;

function show(next) {
  snapshot = next;
  titleEl.textContent = next ? next.title : 'Open a LeetCode problem.';
  metaEl.textContent = next ? next.language : '';
  codeEl.textContent = next ? next.code : '';
  startEl.disabled = !next || running;
  if (running && next) post('/snapshot', next).catch(() => {});
}

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab?.id ?? null;
  // Fails on tabs without the content script, such as any page that is not a LeetCode problem.
  const next = tabId === null ? null : await chrome.tabs.sendMessage(tabId, { type: 'get-snapshot' }).catch(() => null);
  show(next);
}

async function post(path, body) {
  const response = await fetch(SERVER + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw new Error(detail.error ?? `server returned ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}

function clock(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function addLine(kind, atMs, text) {
  const item = document.createElement('li');
  item.className = kind;
  const time = document.createElement('time');
  time.textContent = atMs === null ? '' : clock(atMs);
  const body = document.createElement('span');
  body.textContent = text;
  item.append(time, body);
  conversationEl.append(item);
  item.scrollIntoView({ block: 'end' });
}

function setRunning(next, status) {
  running = next;
  startEl.hidden = next;
  stopEl.hidden = !next;
  startEl.disabled = !snapshot || next;
  statusEl.textContent = status;
}

function connect() {
  const events = new EventSource(`${SERVER}/events`);
  events.addEventListener('status', (event) => {
    const { state } = JSON.parse(event.data);
    if (state === 'stopped') setRunning(false, '');
    else setRunning(true, state === 'thinking' ? 'Interviewer is thinking…' : 'Listening');
  });
  events.addEventListener('heard', (event) => {
    const { atMs, text } = JSON.parse(event.data);
    addLine('heard', atMs, text);
  });
  events.addEventListener('interviewer', (event) => {
    const { atMs, text, hintLevel } = JSON.parse(event.data);
    addLine('interviewer', atMs, hintLevel > 0 ? `${text} (hint ${hintLevel})` : text);
  });
  events.addEventListener('stage', (event) => {
    metaEl.textContent = `${snapshot?.language ?? ''} · stage: ${JSON.parse(event.data).stage}`;
  });
  events.addEventListener('error', (event) => {
    if (event.data) addLine('error', null, JSON.parse(event.data).message);
  });
  // EventSource reconnects by itself; this only says why nothing is happening.
  events.onerror = () => {
    if (events.readyState !== EventSource.OPEN) statusEl.textContent = 'Server not running: npm start';
  };
}

startEl.addEventListener('click', async () => {
  conversationEl.replaceChildren();
  startEl.disabled = true;
  try {
    await post('/start', snapshot);
  } catch (error) {
    addLine('error', null, `Could not start: ${error.message}`);
    startEl.disabled = false;
  }
});

stopEl.addEventListener('click', async () => {
  try {
    const { file } = await post('/stop');
    if (file) addLine('note', null, `Saved to ${file}`);
  } catch (error) {
    addLine('error', null, `Could not stop: ${error.message}`);
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === 'snapshot' && sender.tab?.id === tabId) show(message.snapshot);
});
chrome.tabs.onActivated.addListener(refresh);
chrome.tabs.onUpdated.addListener((id, change) => {
  if (id === tabId && change.status === 'complete') refresh();
});

refresh();
connect();
