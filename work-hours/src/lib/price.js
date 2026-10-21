/**
 * Turns a ringgit or Singapore dollar price into the time it takes to earn it. No Chrome calls,
 * so `npm test` runs it in Node.
 */

/**
 * Monthly pay is take-home pay, after EPF or CPF and tax, in `payCurrency`. Empty until the
 * user enters it. `sgdToMyr` is ringgit per Singapore dollar, 3.19 on 21 Oct 2026.
 */
export const DEFAULT_SETTINGS = { monthlyPay: null, payCurrency: 'MYR', hoursPerWeek: 40, sgdToMyr: 3.19 };

const WEEKS_PER_MONTH = 52 / 12;
const WORK_DAYS_PER_WEEK = 5;

// "1,299.00", "1299", "49.9". Groups 1 and 2 are the whole units and the cents.
const AMOUNT = String.raw`(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?`;
// Singapore shops write "$12.90"; some write "S$" or "SGD".
const SYMBOL = { MYR: 'RM', SGD: String.raw`(?:S\$|SGD|\$)` };
// The whole text must be one price or one range, so "Free shipping above RM50" is not a price.
const PRICE = Object.fromEntries(
  Object.entries(SYMBOL).map(([currency, symbol]) => [
    currency,
    new RegExp(String.raw`^${symbol}\s?${AMOUNT}(?:\s?[-–~]\s?(?:${symbol}\s?)?${AMOUNT})?$`, 'i'),
  ]),
);

/** shopee.sg → "SGD"; any other site the extension runs on is Malaysian. */
export function currencyForHost(hostname) {
  return hostname.endsWith('.sg') ? 'SGD' : 'MYR';
}

/** "RM12.90 - RM20.00" → { low: 12.9, high: 20, currency: "MYR" }. Anything else → null. */
export function parsePrice(text, currency = 'MYR') {
  const match = PRICE[currency].exec(text.trim());
  if (!match) return null;
  const toNumber = (whole, cents) => Number(`${whole.replaceAll(',', '')}.${cents ?? '0'}`);
  const low = toNumber(match[1], match[2]);
  const high = match[3] ? toNumber(match[3], match[4]) : low;
  return { low, high, currency };
}

/** An amount in the shop's currency, in the currency the pay is entered in. */
export function toPayCurrency(amount, priceCurrency, { payCurrency, sgdToMyr }) {
  if (priceCurrency === payCurrency) return amount;
  return priceCurrency === 'SGD' ? amount * sgdToMyr : amount / sgdToMyr;
}

/** Pay per hour, in the pay currency, or null until both settings are positive. */
export function hourlyPay({ monthlyPay, hoursPerWeek }) {
  if (!(monthlyPay > 0) || !(hoursPerWeek > 0)) return null;
  return monthlyPay / (hoursPerWeek * WEEKS_PER_MONTH);
}

export function workMinutes(amount, settings) {
  const rate = hourlyPay(settings);
  return rate === null ? null : Math.round((amount / rate) * 60);
}

/** 45 → "45 min", 104 → "1 h 44 min", 1200 → "2.5 days" (work days). */
export function formatWork(minutes, hoursPerWeek) {
  if (minutes < 1) return 'under 1 min';
  if (minutes < 60) return `${minutes} min`;

  const minutesPerDay = (hoursPerWeek / WORK_DAYS_PER_WEEK) * 60;
  if (minutes < minutesPerDay) {
    const [hours, rest] = [Math.floor(minutes / 60), minutes % 60];
    return rest ? `${hours} h ${rest} min` : `${hours} h`;
  }

  const days = minutes / minutesPerDay;
  return `${days < 10 ? days.toFixed(1) : Math.round(days)} days`;
}

/** The text shown beside a price, or null when there is no pay to measure against. */
export function workLabel({ low, high, currency }, settings) {
  if (hourlyPay(settings) === null) return null;
  const format = (amount) =>
    formatWork(workMinutes(toPayCurrency(amount, currency, settings), settings), settings.hoursPerWeek);
  const time = low === high ? format(low) : `${format(low)} – ${format(high)}`;
  return `≈ ${time} of work`;
}
