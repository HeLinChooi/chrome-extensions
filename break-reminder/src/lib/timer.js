/**
 * Screen-time state machine. It has no Chrome calls, so it can be tested in Node.
 *
 * The background script observes the system idle state once a minute and on
 * every change, and passes each observation to `observe`. "idle" means no
 * keyboard or mouse input for the whole break length, so a reported idle state
 * is already a completed break.
 */

const MIN = 60_000;

export const DEFAULT_SETTINGS = {
  workMinutes: 30,
  breakMinutes: 5,
  repeatMinutes: 5,
  enabled: true,
  // Treat a tab playing sound as screen time, so a long video is not a "break".
  audibleCountsAsActive: true,
};

export function emptyState() {
  return {
    activeSince: null, // start of the current stretch of screen time
    awaySince: null, // when the screen was locked
    lastSeenAt: null, // time of the previous observation
    remindedAt: null,
    snoozedUntil: null,
  };
}

function rested() {
  return { ...emptyState() };
}

/**
 * @param state from the previous call, or emptyState()
 * @param observation { now, idle: 'active' | 'idle' | 'locked' }
 * @returns { state, remind } where remind is true when a reminder should be shown now
 */
export function observe(state, { now, idle }, settings) {
  const breakMs = settings.breakMinutes * MIN;
  let next = { ...state };

  // Nothing was observed for a whole break: the machine slept or Chrome was closed.
  if (next.lastSeenAt !== null && now - next.lastSeenAt >= breakMs) next = rested();

  if (idle === 'idle') {
    next = rested();
  } else if (idle === 'locked') {
    next.awaySince ??= now;
    if (now - next.awaySince >= breakMs) next = { ...rested(), awaySince: next.awaySince };
  } else {
    if (next.awaySince !== null && now - next.awaySince >= breakMs) next = rested();
    next.awaySince = null;
    next.activeSince ??= now;
  }
  next.lastSeenAt = now;

  const remind = isDue(next, now, settings);
  if (remind) next = { ...next, remindedAt: now, snoozedUntil: null };
  return { state: next, remind };
}

function isDue(state, now, settings) {
  if (!settings.enabled || state.activeSince === null || state.awaySince !== null) return false;
  if (now - state.activeSince < settings.workMinutes * MIN) return false;
  if (state.snoozedUntil !== null) return now >= state.snoozedUntil;
  return state.remindedAt === null || now - state.remindedAt >= settings.repeatMinutes * MIN;
}

export function snooze(state, now, minutes) {
  return { ...state, snoozedUntil: now + minutes * MIN };
}

/** Starts the screen-time clock again from now, for a break the idle check missed. */
export function startOver(state, now) {
  return { ...rested(), activeSince: now, lastSeenAt: now };
}

export function screenMinutes(state, now) {
  if (state.activeSince === null) return 0;
  return Math.floor((now - state.activeSince) / MIN);
}
