import { DEFAULT_SETTINGS, emptyState, observe, snooze, startOver, screenMinutes } from './lib/timer.js';

const TICK = 'tick';
const NOTIFICATION = 'break';
const SNOOZE_MINUTES = 10;

async function loadSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function loadState() {
  const { timer } = await chrome.storage.local.get('timer');
  return { ...emptyState(), ...timer };
}

async function setUp() {
  const settings = await loadSettings();
  // Chrome reports "idle" once there has been no input for this long, system-wide.
  chrome.idle.setDetectionInterval(settings.breakMinutes * 60);
  if (!(await chrome.alarms.get(TICK))) await chrome.alarms.create(TICK, { periodInMinutes: 1 });
}

/** A video with no mouse movement still counts as looking at the screen. */
async function effectiveIdle(idle, settings) {
  if (idle !== 'idle' || !settings.audibleCountsAsActive) return idle;
  const audible = await chrome.tabs.query({ audible: true });
  return audible.length ? 'active' : idle;
}

async function handle(idle) {
  const settings = await loadSettings();
  const now = Date.now();
  const { state, remind } = observe(await loadState(), { now, idle: await effectiveIdle(idle, settings) }, settings);
  await chrome.storage.local.set({ timer: state });
  await updateBadge(state, settings, now);
  if (remind) await showReminder(screenMinutes(state, now));
}

async function tick() {
  const settings = await loadSettings();
  await handle(await chrome.idle.queryState(settings.breakMinutes * 60));
}

async function updateBadge(state, settings, now) {
  if (!settings.enabled) {
    await chrome.action.setBadgeText({ text: 'off' });
    await chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
    return;
  }
  const minutes = screenMinutes(state, now);
  await chrome.action.setBadgeText({ text: state.activeSince === null ? '' : String(minutes) });
  await chrome.action.setBadgeBackgroundColor({ color: minutes >= settings.workMinutes ? '#dc2626' : '#2563eb' });
}

async function showReminder(minutes) {
  await chrome.notifications.clear(NOTIFICATION);
  await chrome.notifications.create(NOTIFICATION, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'Time for a break',
    message: `You have been at the screen for ${minutes} minutes. Stand up and look at something far away.`,
    buttons: [{ title: `Snooze ${SNOOZE_MINUTES} min` }, { title: 'I took a break' }],
    requireInteraction: true,
    priority: 2,
  });
}

async function update(change) {
  const now = Date.now();
  const state = change(await loadState(), now);
  await chrome.storage.local.set({ timer: state });
  await chrome.notifications.clear(NOTIFICATION);
  await updateBadge(state, await loadSettings(), now);
}

const actions = {
  snooze: () => update((state, now) => snooze(state, now, SNOOZE_MINUTES)),
  startOver: () => update(startOver),
};

// Runs each time Chrome starts the worker, so a lost alarm is created again.
setUp();
chrome.alarms.onAlarm.addListener((alarm) => alarm.name === TICK && tick());
chrome.idle.onStateChanged.addListener(handle);

chrome.notifications.onButtonClicked.addListener((id, index) => {
  if (id === NOTIFICATION) (index === 0 ? actions.snooze : actions.startOver)();
});

chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  const action = actions[message?.type];
  if (!action) return false;
  action().then(() => reply({ ok: true }));
  return true; // reply is sent asynchronously
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.settings) setUp().then(tick);
});
