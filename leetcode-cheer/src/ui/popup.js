import { emptyState, levelOf, currentStreak, solvedToday, XP_PER_LEVEL } from '../lib/progress.js';

const STATE_KEY = 'progress';
const $ = (id) => document.getElementById(id);

async function loadState() {
  const stored = (await chrome.storage.local.get(STATE_KEY))[STATE_KEY];
  return { ...emptyState(), ...stored };
}

function render(state) {
  const now = Date.now();
  const level = levelOf(state.xp);
  const into = state.xp % XP_PER_LEVEL;

  $('level').textContent = `Level ${level}`;
  $('xp').textContent = `${state.xp} XP · ${XP_PER_LEVEL - into} to level ${level + 1}`;
  $('fill').style.width = `${(into / XP_PER_LEVEL) * 100}%`;
  $('streak').textContent = String(currentStreak(state, now));
  $('today').textContent = `${solvedToday(state, now)}/${state.goal}`;
  $('goal').value = String(state.goal);

  const list = $('recent');
  list.innerHTML = '';
  if (!state.recent.length) {
    const empty = document.createElement('li');
    empty.className = 'muted';
    empty.textContent = 'Nothing yet. Submit a solution on LeetCode.';
    list.appendChild(empty);
  }
  for (const solve of state.recent.slice(0, 8)) {
    const item = document.createElement('li');
    const name = document.createElement('a');
    name.href = `https://leetcode.com/problems/${solve.slug}/`;
    name.target = '_blank';
    name.textContent = solve.title;
    const meta = document.createElement('span');
    meta.className = 'muted';
    meta.textContent = [solve.difficulty, `+${solve.xp} XP`, solve.firstTry ? 'first try' : '', solve.kind === 'review' ? 'review' : '']
      .filter(Boolean)
      .join(' · ');
    item.append(name, meta);
    list.appendChild(item);
  }
}

$('goal').addEventListener('change', async () => {
  const goal = Math.min(20, Math.max(1, Math.round(Number($('goal').value)) || 1));
  const state = { ...(await loadState()), goal };
  await chrome.storage.local.set({ [STATE_KEY]: state });
  render(state);
});

$('preview').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'preview' });
    window.close();
  } catch {
    // No content script answers outside a LeetCode problem page.
    $('previewNote').hidden = false;
  }
});

loadState().then(render);
