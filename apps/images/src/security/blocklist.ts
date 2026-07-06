// Known exploit-probe path patterns seen scanning image proxies and CMS
// backends (dotfile secrets, WordPress/phpMyAdmin/Spring Boot probes). This
// app has no legitimate use for any of these — matches short-circuit before
// source resolution and count as an abuse strike against the client.
//
// Deliberately NOT included: /.well-known/* — that's benign discoverability
// (e.g. Chrome DevTools auto-probing com.chrome.devtools.json), not an
// attack, so it stays on the normal 404 path with no strike recorded.
const BLOCKED_PATH_PATTERNS: RegExp[] = [
  /(?:^|\/)\.git(?:\/|$)/i,
  /(?:^|\/)\.env(?:\/|$)/i,
  /(?:^|\/)\.aws(?:\/|$)/i,
  /(?:^|\/)\.ssh(?:\/|$)/i,
  /(?:^|\/)\.docker(?:\/|$)/i,
  /(?:^|\/)\.vscode(?:\/|$)/i,
  /(?:^|\/)\.idea(?:\/|$)/i,
  /(?:^|\/)wp-(?:admin|includes|login|content)(?:\/|$|\.php)/i,
  /(?:^|\/)xmlrpc\.php$/i,
  /(?:^|\/)actuator(?:\/|$)/i,
  /(?:^|\/)phpmyadmin(?:\/|$)/i,
  /(?:^|\/)(?:key|config|credentials|firebase)\.json$/i,
  /(?:^|\/)id_rsa(?:\.pub)?$/i,
  /(?:^|\/)wlwmanifest\.xml$/i,
  /(?:^|\/)eval-stdin\.php$/i,
]

const isBlockedPath = (path: string): boolean =>
  BLOCKED_PATH_PATTERNS.some(pattern => pattern.test(path))

export { isBlockedPath }
