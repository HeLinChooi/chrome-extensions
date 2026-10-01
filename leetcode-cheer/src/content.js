/**
 * Runs in the extension's isolated world on LeetCode problem pages. It receives
 * verdicts from interceptor.js, updates the stored progress, and celebrates.
 */

import { slugFromPath, MESSAGE_TYPE } from './lib/check.js';
import { emptyState, recordAccepted, recordFailure } from './lib/progress.js';
import { throwConfetti, showCard } from './celebrate.js';

const STATE_KEY = 'progress';

/** Title and difficulty from LeetCode's public GraphQL API, or nulls if it fails. */
async function problemInfo(slug) {
  try {
    // No cookies: this is a public query, and without a session LeetCode does
    // not ask for a CSRF token. It is the same request as an anonymous visitor's.
    const response = await fetch('/graphql', {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'query q($titleSlug: String!) { question(titleSlug: $titleSlug) { title difficulty } }',
        variables: { titleSlug: slug },
      }),
    });
    const question = (await response.json()).data.question;
    return { title: question.title, difficulty: question.difficulty };
  } catch (error) {
    // Still celebrate; the solve is scored as Medium.
    console.warn('[leetcode-cheer] could not look up the problem difficulty', error);
    return { title: null, difficulty: null };
  }
}

async function loadState() {
  const stored = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY];
  return { ...emptyState(), ...stored };
}

async function handle({ verdict }) {
  const slug = slugFromPath(location.pathname);
  if (!slug) return;
  const at = Date.now();
  console.info('[leetcode-cheer]', slug, verdict.status);

  if (!verdict.accepted) {
    const state = recordFailure(await loadState(), { slug, at });
    await chrome.storage.local.set({ [STATE_KEY]: state });
    return;
  }

  const info = await problemInfo(slug);
  const { state, reward } = recordAccepted(await loadState(), { slug, ...info, at });
  await chrome.storage.local.set({ [STATE_KEY]: state });
  throwConfetti(reward);
  showCard(reward, verdict);
}

// One at a time, so two quick verdicts cannot both read the old state and
// then overwrite each other's update.
let queue = Promise.resolve();

window.addEventListener('message', (event) => {
  if (event.source !== window || !event.data || event.data.type !== MESSAGE_TYPE) return;
  queue = queue
    .then(() => handle(event.data))
    .catch((error) => console.error('[leetcode-cheer] failed to record a verdict', error));
});

/** The popup's "Preview" button: celebrate a made-up Medium solve, saving nothing. */
chrome.runtime.onMessage.addListener((message) => {
  if (!message || message.type !== 'preview') return;
  const reward = {
    kind: 'new',
    difficulty: 'Medium',
    firstTry: true,
    xpGained: 38,
    xp: 138,
    level: 2,
    levelUp: false,
    xpIntoLevel: 38,
    streak: 3,
    solvedToday: 1,
    goal: 2,
    goalReached: false,
  };
  throwConfetti(reward);
  showCard(reward, { runtimePercentile: 87.5 });
});
