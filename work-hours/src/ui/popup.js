import { DEFAULT_SETTINGS, hourlyPay, workLabel } from '../lib/price.js';

const $ = (id) => document.getElementById(id);
const NUMBERS = ['monthlyPay', 'hoursPerWeek', 'sgdToMyr'];
const SYMBOL = { MYR: 'RM', SGD: 'S$' };
// A price to show what the badge will say.
const EXAMPLE_PRICE = 49.9;

async function load() {
  const { settings } = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...settings };
}

function render(settings) {
  const rate = hourlyPay(settings);
  const symbol = SYMBOL[settings.payCurrency];
  const example = { low: EXAMPLE_PRICE, high: EXAMPLE_PRICE, currency: settings.payCurrency };
  $('symbol').textContent = symbol;
  $('payCurrency').value = settings.payCurrency;
  $('enabled').checked = settings.enabled;
  $('rate').textContent = rate === null ? 'Enter your pay' : `${symbol} ${rate.toFixed(2)}`;
  $('example').textContent =
    rate === null ? '' : `${symbol}${EXAMPLE_PRICE.toFixed(2)} on Shopee shows "${workLabel(example, settings)}".`;
  // A field being typed in keeps its text, so a half-typed number is not replaced.
  for (const key of NUMBERS) if (document.activeElement !== $(key)) $(key).value = settings[key] ?? '';
}

async function saveSettings() {
  const settings = await load();
  settings.enabled = $('enabled').checked;
  settings.payCurrency = $('payCurrency').value;
  for (const key of NUMBERS) {
    const input = $(key);
    const value = Number(input.value);
    settings[key] = value > 0 ? Math.min(Number(input.max), value) : DEFAULT_SETTINGS[key];
  }
  await chrome.storage.sync.set({ settings });
}

// 'input', not 'change': closing the popup does not fire 'change', so the pay would be lost.
for (const key of NUMBERS) $(key).addEventListener('input', saveSettings);
$('payCurrency').addEventListener('change', saveSettings);
$('enabled').addEventListener('change', saveSettings);

chrome.storage.onChanged.addListener(async () => render(await load()));
render(await load());
