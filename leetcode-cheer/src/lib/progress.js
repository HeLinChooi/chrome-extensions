/**
 * XP, levels, streaks and the daily goal. Pure: every function takes the
 * current time as an argument and returns a new state instead of changing it.
 */

export const BASE_XP = { Easy: 10, Medium: 25, Hard: 50 };
export const FIRST_TRY_BONUS = 1.5;
export const XP_PER_LEVEL = 100;
export const DEFAULT_GOAL = 2;

/** Solving a problem again counts as review only after this many days. */
export const REVIEW_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_LIMIT = 20;

export function emptyState() {
  return {
    xp: 0,
    goal: DEFAULT_GOAL,
    streak: { count: 0, lastDay: null },
    days: {},
    problems: {},
    recent: [],
  };
}

/** The local calendar day, "2026-10-02". */
export function dayKey(time) {
  const d = new Date(time);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function previousDay(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1).getTime());
}

export const levelOf = (xp) => 1 + Math.floor(xp / XP_PER_LEVEL);

/** The streak as it stands now: it is broken once a whole day passes with no solve. */
export function currentStreak(state, now) {
  const { count, lastDay } = state.streak;
  const today = dayKey(now);
  return lastDay === today || lastDay === previousDay(today) ? count : 0;
}

export function solvedToday(state, now) {
  return (state.days[dayKey(now)] || { solved: 0 }).solved;
}

/** A failed submission. It only matters for the first-try bonus. */
export function recordFailure(state, { slug, at }) {
  const today = dayKey(at);
  const problem = state.problems[slug] || {};
  const fails = problem.failDay === today ? (problem.fails || 0) + 1 : 1;
  return {
    ...state,
    problems: { ...state.problems, [slug]: { ...problem, failDay: today, fails } },
  };
}

/**
 * An accepted submission.
 *
 * @param {{slug: string, title?: string, difficulty?: string, at: number}} solve
 * @returns {{state: object, reward: object}} the reward says what to celebrate
 */
export function recordAccepted(state, { slug, title, difficulty, at }) {
  const today = dayKey(at);
  const problem = state.problems[slug] || {};
  const base = BASE_XP[difficulty] || BASE_XP.Medium;

  const firstTry = !(problem.failDay === today && problem.fails > 0);
  let kind;
  if (!problem.lastSolvedAt) kind = 'new';
  else if (at - problem.lastSolvedAt >= REVIEW_AFTER_DAYS * DAY_MS) kind = 'review';
  else kind = 'repeat';

  // A repeat earns nothing, so resubmitting a solved problem cannot farm XP.
  const factor = kind === 'new' ? 1 : kind === 'review' ? 0.5 : 0;
  const xpGained = Math.round(base * factor * (firstTry ? FIRST_TRY_BONUS : 1));

  // A repeat does not count towards the daily goal or the streak either.
  const counts = kind !== 'repeat';
  const solvedBefore = solvedToday(state, at);
  const solvedNow = counts ? solvedBefore + 1 : solvedBefore;

  let streak = state.streak;
  if (counts && streak.lastDay !== today) {
    const continues = streak.lastDay === previousDay(today);
    streak = { count: continues ? streak.count + 1 : 1, lastDay: today };
  }

  const xp = state.xp + xpGained;
  const next = {
    ...state,
    xp,
    streak,
    days: counts ? { ...state.days, [today]: { solved: solvedNow } } : state.days,
    problems: {
      ...state.problems,
      [slug]: {
        title: title || problem.title || slug,
        difficulty: difficulty || problem.difficulty || null,
        lastSolvedAt: at,
        solves: (problem.solves || 0) + 1,
        failDay: null,
        fails: 0,
      },
    },
    recent: [{ slug, title: title || slug, difficulty: difficulty || null, xp: xpGained, kind, firstTry, at }, ...state.recent].slice(
      0,
      RECENT_LIMIT,
    ),
  };

  return {
    state: next,
    reward: {
      kind,
      difficulty: BASE_XP[difficulty] ? difficulty : null,
      firstTry,
      xpGained,
      xp,
      level: levelOf(xp),
      levelUp: levelOf(xp) > levelOf(state.xp),
      xpIntoLevel: xp % XP_PER_LEVEL,
      streak: streak.count,
      solvedToday: solvedNow,
      goal: state.goal,
      goalReached: counts && solvedBefore < state.goal && solvedNow >= state.goal,
    },
  };
}
