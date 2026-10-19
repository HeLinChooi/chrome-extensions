/**
 * The nightly tab snapshot read by the coach on the host.
 *
 * The coach runs in Docker and cannot see Chrome, so the extension saves one
 * small JSON file a day into Downloads, and the host's 22:25 export moves it
 * into the coach's folder. Only titles and URLs leave the extension: the coach
 * asks "how long has this tab been open", which estimates do not answer.
 *
 * Pure functions here; the Chrome calls are in background.js.
 */

import { isInternalUrl } from './taxonomy.js';

export const SNAPSHOT_VERSION = 1;

/** YYYY-MM-DD in local time. toISOString() would give the UTC day. */
export function localDate(at) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

/** Relative to the Downloads folder. One file per day; a rerun overwrites it. */
export function snapshotFilename(at) {
  return `tab-triage/${localDate(at)}.json`;
}

/**
 * Pinned tabs are left out: they stay open on purpose, so "open for six days"
 * says nothing about them.
 */
export function buildSnapshot(tabs, at) {
  const kept = [];
  for (const tab of tabs) {
    const url = tab.url || tab.pendingUrl || '';
    if (!url || tab.pinned || isInternalUrl(url)) continue;
    kept.push({ url, title: tab.title || '(untitled)' });
  }
  return { version: SNAPSHOT_VERSION, date: localDate(at), takenAt: at.toISOString(), tabs: kept };
}
