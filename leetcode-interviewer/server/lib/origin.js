// Any website open in Chrome can send requests to 127.0.0.1, but the
// browser sets the Origin header and a page cannot change it. Accepting only
// extension origins keeps websites from reading the transcript or driving
// the interviewer.

export function isTrustedOrigin(origin) {
  return typeof origin === 'string' && origin.startsWith('chrome-extension://');
}
