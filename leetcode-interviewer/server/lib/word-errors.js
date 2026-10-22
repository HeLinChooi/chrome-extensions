// Counts the words Whisper got wrong, against a passage read aloud.

const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen', 'twenty',
];

// Whisper writes "O(n²)" or "2" where the speaker said "O of n squared" or
// "two". Both spellings must compare equal, or a correct transcript counts
// as wrong.
export function normalize(text) {
  return text
    .toLowerCase()
    .replace(/o\(([^)]*)\)/g, ' o of $1 ')
    .replace(/\^2|²/g, ' squared ')
    .replace(/[^a-z0-9' ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => NUMBER_WORDS[Number(word)] ?? word);
}

// Word-level edit distance. Each mistake is { expected, heard }: a missing
// word has heard null, and an extra word has expected null.
export function wordErrors(reference, transcript) {
  const ref = normalize(reference);
  const hyp = normalize(transcript);
  const cost = Array.from({ length: ref.length + 1 }, (_, i) =>
    Array.from({ length: hyp.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= ref.length; i++) {
    for (let j = 1; j <= hyp.length; j++) {
      const same = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      cost[i][j] = Math.min(cost[i - 1][j - 1] + same, cost[i - 1][j] + 1, cost[i][j - 1] + 1);
    }
  }

  const mistakes = [];
  let i = ref.length;
  let j = hyp.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && cost[i][j] === cost[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) {
      if (ref[i - 1] !== hyp[j - 1]) mistakes.push({ expected: ref[i - 1], heard: hyp[j - 1] });
      i--;
      j--;
    } else if (i > 0 && cost[i][j] === cost[i - 1][j] + 1) {
      mistakes.push({ expected: ref[i - 1], heard: null });
      i--;
    } else {
      mistakes.push({ expected: null, heard: hyp[j - 1] });
      j--;
    }
  }
  mistakes.reverse();

  const errors = cost[ref.length][hyp.length];
  return { errors, rate: ref.length ? errors / ref.length : 0, mistakes };
}
