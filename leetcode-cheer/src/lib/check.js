/**
 * Reading LeetCode's submission-check responses. Pure.
 *
 * After "Submit", the page polls /submissions/detail/<id>/check/ (newer pages
 * use /v2/check/) until the judge finishes. "Run" polls a similar URL, but its
 * id is not a number (it looks like "runcode_..."), so the numeric id is what
 * tells a real submission apart from a test run.
 */

/** interceptor.js passes verdicts to content.js under this message type. */
export const MESSAGE_TYPE = 'leetcode-cheer:verdict';

const CHECK_URL = /\/submissions\/detail\/(\d+)\/(?:v\d+\/)?check\/?(?:[?#]|$)/;

/** LeetCode's status code for an accepted submission. */
const ACCEPTED = 10;

/** The submission id when the URL is a submission check, otherwise null. */
export function submissionIdFromUrl(url) {
  const match = String(url || '').match(CHECK_URL);
  return match ? match[1] : null;
}

/**
 * @returns {null | {accepted: boolean, status: string, runtimePercentile: number|null, memoryPercentile: number|null}}
 *   null while the judge is still running, so the caller waits for the next poll.
 */
export function readVerdict(data) {
  if (!data || data.state !== 'SUCCESS') return null;
  return {
    accepted: data.status_code === ACCEPTED,
    status: data.status_msg || 'Unknown',
    runtimePercentile: percentile(data.runtime_percentile),
    memoryPercentile: percentile(data.memory_percentile),
  };
}

const percentile = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** "/problems/two-sum/description/" -> "two-sum". */
export function slugFromPath(pathname) {
  const match = String(pathname || '').match(/^\/problems\/([^/]+)/);
  return match ? match[1] : null;
}
