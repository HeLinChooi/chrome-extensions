// Any website open in Chrome can send requests to 127.0.0.1, but the
// browser sets the Origin header and a page cannot change it. Accepting only
// extension origins keeps websites from reading the transcript or driving
// the interviewer.
//
// A request with no Origin is allowed only for GET. The Fetch standard has
// browsers send Origin on every request that is not GET or HEAD, and on every
// cross-origin request that can read its response. So a website cannot send a
// POST without one, and a GET without one cannot read what comes back. Chrome
// sends no Origin on the panel's own GET to /events.

export function isTrustedRequest(method, origin) {
  if (origin === undefined) return method === 'GET';
  return origin.startsWith('chrome-extension://');
}
