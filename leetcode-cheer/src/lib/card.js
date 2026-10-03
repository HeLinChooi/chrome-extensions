/** The text on the celebration card. Pure. */

/** The lines shown on the card, most important first. */
export function cardLines(reward, verdict) {
  const lines = [];
  if (reward.levelUp) lines.push(`Level ${reward.level}!`);
  if (reward.goalReached) lines.push(`Daily goal reached: ${reward.solvedToday}/${reward.goal}`);

  if (reward.kind === 'repeat') {
    lines.push('Solved again. No XP for a repeat within a week.');
  } else {
    const bits = [`+${reward.xpGained} XP`];
    if (reward.firstTry) bits.push('first try ×1.5');
    if (reward.kind === 'review') bits.push('review ×0.5');
    lines.push(bits.join(' · '));
  }

  lines.push(`🔥 ${reward.streak}-day streak · today ${reward.solvedToday}/${reward.goal}`);
  if (verdict && verdict.runtimePercentile != null) {
    lines.push(`Runtime beats ${verdict.runtimePercentile.toFixed(1)}%`);
  }
  return lines;
}
