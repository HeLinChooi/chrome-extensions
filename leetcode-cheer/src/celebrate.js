/**
 * The celebration: confetti sized to the solve, and a card that says what was
 * earned. The card lives in a shadow root so LeetCode's CSS cannot restyle it.
 */

import confetti from 'canvas-confetti';
import { cardLines } from './lib/card.js';
import { XP_PER_LEVEL } from './lib/progress.js';

const GOLD = ['#f5c542', '#ffd966', '#fff2b3', '#e0a800'];
const TOP = 2147483647;

const fire = (options) => confetti({ zIndex: TOP, disableForReducedMotion: true, ...options });

function burst(scale, colors) {
  fire({ particleCount: Math.round(90 * scale), spread: 70 + 30 * scale, origin: { y: 0.65 }, colors });
}

function sideCannons(colors) {
  fire({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.75 }, colors });
  fire({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.75 }, colors });
}

function fireworks(ms, colors) {
  const end = Date.now() + ms;
  const timer = setInterval(() => {
    if (Date.now() > end) return clearInterval(timer);
    fire({
      particleCount: 40,
      startVelocity: 30,
      spread: 360,
      ticks: 70,
      origin: { x: 0.15 + Math.random() * 0.7, y: 0.15 + Math.random() * 0.35 },
      colors,
    });
  }, 250);
}

export function throwConfetti(reward) {
  const colors = reward.firstTry && reward.kind !== 'repeat' ? GOLD : undefined;
  if (reward.kind === 'repeat') return burst(0.4, colors);

  if (reward.difficulty === 'Hard') fireworks(3000, colors);
  else if (reward.difficulty === 'Medium') sideCannons(colors);
  else burst(1, colors);

  // The bigger moments get a second wave on top.
  if (reward.goalReached || reward.levelUp) setTimeout(() => fireworks(2000), 600);
}

const CARD_CSS = `
  :host { all: initial; }
  .card {
    position: fixed; right: 24px; bottom: 24px; z-index: ${TOP};
    min-width: 260px; max-width: 340px; padding: 16px 18px 14px;
    border-radius: 12px; background: #1f2430; color: #f4f4f5;
    font: 14px/1.45 system-ui, -apple-system, sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,.35);
    transform: translateY(20px); opacity: 0; transition: transform .3s ease, opacity .3s ease;
  }
  .card.show { transform: none; opacity: 1; }
  .card.gold { border: 2px solid #f5c542; }
  .head { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
  .line:first-of-type { font-weight: 600; }
  .bar { height: 6px; margin-top: 10px; border-radius: 3px; background: #3a4150; overflow: hidden; }
  .fill { height: 100%; background: #2cbb5d; }
  .level { margin-top: 4px; font-size: 12px; color: #a1a1aa; }
  button { all: unset; position: absolute; top: 8px; right: 12px; cursor: pointer; color: #a1a1aa; }
  @media (prefers-reduced-motion: reduce) { .card { transition: none; } }
`;

const HEADINGS = { Easy: 'Accepted · Easy', Medium: 'Accepted · Medium', Hard: 'Accepted · Hard!' };

export function showCard(reward, verdict) {
  document.getElementById('leetcode-cheer-card')?.remove();

  const host = document.createElement('div');
  host.id = 'leetcode-cheer-card';
  const root = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = CARD_CSS;

  const card = document.createElement('div');
  card.className = 'card';
  if (reward.firstTry && reward.kind !== 'repeat') card.classList.add('gold');

  const head = document.createElement('div');
  head.className = 'head';
  head.textContent = HEADINGS[reward.difficulty] || 'Accepted';
  card.appendChild(head);

  for (const text of cardLines(reward, verdict)) {
    const line = document.createElement('div');
    line.className = 'line';
    line.textContent = text;
    card.appendChild(line);
  }

  const bar = document.createElement('div');
  bar.className = 'bar';
  const fill = document.createElement('div');
  fill.className = 'fill';
  fill.style.width = `${(reward.xpIntoLevel / XP_PER_LEVEL) * 100}%`;
  bar.appendChild(fill);
  const level = document.createElement('div');
  level.className = 'level';
  level.textContent = `Level ${reward.level} · ${reward.xpIntoLevel}/${XP_PER_LEVEL} XP to level ${reward.level + 1}`;

  const close = document.createElement('button');
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', () => host.remove());

  card.append(bar, level, close);
  root.append(style, card);
  document.documentElement.appendChild(host);

  requestAnimationFrame(() => card.classList.add('show'));
  setTimeout(() => host.remove(), 9000);
}
