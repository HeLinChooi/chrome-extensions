import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice, hourlyPay, workMinutes, formatWork, workLabel, toPayCurrency, currencyForHost } from '../src/lib/price.js';

// RM 5,000 a month over 40 hours a week is about RM 28.85 an hour.
const settings = { monthlyPay: 5000, payCurrency: 'MYR', hoursPerWeek: 40, sgdToMyr: 3.2 };

test('parses a plain ringgit price', () => {
  assert.deepEqual(parsePrice('RM49.90'), { low: 49.9, high: 49.9, currency: 'MYR' });
});

test('parses a price with a space and thousands separators', () => {
  assert.deepEqual(parsePrice(' RM 1,299.00 '), { low: 1299, high: 1299, currency: 'MYR' });
});

test('parses a price with no cents', () => {
  assert.deepEqual(parsePrice('RM12'), { low: 12, high: 12, currency: 'MYR' });
});

test('parses a Shopee price range', () => {
  assert.deepEqual(parsePrice('RM12.90 - RM20.00'), { low: 12.9, high: 20, currency: 'MYR' });
});

test('parses a range with RM only on the first number', () => {
  assert.deepEqual(parsePrice('RM12.90 - 20.00'), { low: 12.9, high: 20, currency: 'MYR' });
});

test('does not parse a number without RM', () => {
  assert.equal(parsePrice('49.90'), null);
});

test('does not parse a price inside a longer sentence', () => {
  assert.equal(parsePrice('Free shipping above RM50'), null);
});

test('does not parse another currency', () => {
  assert.equal(parsePrice('S$49.90'), null);
});

test('parses a Singapore price with a plain dollar sign', () => {
  assert.deepEqual(parsePrice('$49.90', 'SGD'), { low: 49.9, high: 49.9, currency: 'SGD' });
});

test('parses S$ and SGD prices', () => {
  assert.deepEqual(parsePrice('S$1,299', 'SGD'), { low: 1299, high: 1299, currency: 'SGD' });
  assert.deepEqual(parsePrice('SGD 5.50', 'SGD'), { low: 5.5, high: 5.5, currency: 'SGD' });
});

test('parses a Singapore range', () => {
  assert.deepEqual(parsePrice('$12.90 - $20.00', 'SGD'), { low: 12.9, high: 20, currency: 'SGD' });
});

test('does not parse RM on a Singapore site', () => {
  assert.equal(parsePrice('RM49.90', 'SGD'), null);
});

test('the site decides the currency', () => {
  assert.equal(currencyForHost('shopee.sg'), 'SGD');
  assert.equal(currencyForHost('www.lazada.com.my'), 'MYR');
});

test('a Singapore price is converted to ringgit pay', () => {
  assert.equal(toPayCurrency(10, 'SGD', settings), 32);
});

test('a ringgit price is converted to Singapore pay', () => {
  assert.equal(toPayCurrency(32, 'MYR', { ...settings, payCurrency: 'SGD' }), 10);
});

test('a price in the pay currency is not converted', () => {
  assert.equal(toPayCurrency(10, 'MYR', settings), 10);
});

test('hourly pay uses 52 weeks over 12 months', () => {
  assert.equal(hourlyPay(settings).toFixed(2), '28.85');
});

test('no hourly pay until a monthly pay is entered', () => {
  assert.equal(hourlyPay({ monthlyPay: null, hoursPerWeek: 40 }), null);
});

test('work minutes for a RM 49.90 item', () => {
  assert.equal(workMinutes(49.9, settings), 104);
});

test('formats under an hour in minutes', () => {
  assert.equal(formatWork(45, 40), '45 min');
});

test('formats less than a minute', () => {
  assert.equal(formatWork(0, 40), 'under 1 min');
});

test('formats under a work day in hours and minutes', () => {
  assert.equal(formatWork(104, 40), '1 h 44 min');
});

test('formats whole hours without minutes', () => {
  assert.equal(formatWork(180, 40), '3 h');
});

test('formats a work day or more in work days, from hours per week over 5', () => {
  assert.equal(formatWork(8 * 60 * 2.5, 40), '2.5 days');
});

test('formats ten work days or more as a whole number', () => {
  assert.equal(formatWork(8 * 60 * 45.2, 40), '45 days');
});

test('the label for one price', () => {
  assert.equal(workLabel({ low: 49.9, high: 49.9, currency: 'MYR' }, settings), '≈ 1 h 44 min of work');
});

test('the label for a range', () => {
  assert.equal(workLabel({ low: 12.9, high: 20, currency: 'MYR' }, settings), '≈ 27 min – 42 min of work');
});

test('the label for a Singapore price with Singapore pay', () => {
  // S$ 6,000 a month over 40 hours a week is about S$ 34.62 an hour.
  const sg = { ...settings, monthlyPay: 6000, payCurrency: 'SGD' };
  assert.equal(workLabel({ low: 34.62, high: 34.62, currency: 'SGD' }, sg), '≈ 1 h of work');
});

test('no label until a monthly pay is entered', () => {
  assert.equal(workLabel({ low: 49.9, high: 49.9, currency: 'MYR' }, { ...settings, monthlyPay: null }), null);
});
