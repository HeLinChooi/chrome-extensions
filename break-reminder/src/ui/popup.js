import { DEFAULT_SETTINGS, emptyState, screenMinutes } from '../lib/timer.js';

const $ = (id) => document.getElementById(id);
const NUMBERS = ['workMinutes', 'breakMinutes', 'repeatMinutes'];
const CHECKBOXES = ['enabled', 'audibleCountsAsActive'];

async function load() {
  const { settings, timer } = await chrome.storage.local.get(['settings', 'timer']);
  return { settings: { ...DEFAULT_SETTINGS, ...settings }, state: { ...emptyState(), ...timer } };
}

function render({ settings, state }) {
  const now = Date.now();
  const minutes = screenMinutes(state, now);
  const due = state.activeSince !== null && minutes >= settings.workMinutes;

  $('minutes').textContent = `${minutes} min`;
  $('fill').style.width = `${Math.min(1, minutes / settings.workMinutes) * 100}%`;
  $('fill').classList.toggle('due', due);
  $('due').textContent = !settings.enabled
    ? 'Reminders are off.'
    : state.activeSince === null
      ? 'You are on a break.'
      : due
        ? 'A break is due now.'
        : `Break due in ${settings.workMinutes - minutes} min.`;
  $('snooze').hidden = !due;

  for (const key of NUMBERS) $(key).value = String(settings[key]);
  for (const key of CHECKBOXES) $(key).checked = settings[key];
}

async function saveSettings() {
  const { settings } = await load();
  for (const key of NUMBERS) {
    const input = $(key);
    const value = Math.round(Number(input.value));
    settings[key] = Math.min(Number(input.max), Math.max(Number(input.min), value || DEFAULT_SETTINGS[key]));
  }
  for (const key of CHECKBOXES) settings[key] = $(key).checked;
  await chrome.storage.local.set({ settings });
}

for (const key of [...NUMBERS, ...CHECKBOXES]) $(key).addEventListener('change', saveSettings);

for (const type of ['startOver', 'snooze']) {
  $(type).addEventListener('click', () => chrome.runtime.sendMessage({ type }));
}

chrome.storage.onChanged.addListener(async () => render(await load()));
render(await load());
