/**
 * Minimal allowlist sanitizer for authored-HTML sinks (practice JSON, lesson
 * reveal/explanation fields). Trust boundary is repo PRs, not remote users —
 * this is defense-in-depth, not a substitute for content review. No new
 * dependency on purpose: DOMPurify would be heavier than the threat warrants.
 */
export function sanitizeAuthoredHtml(html: string): string {
  return html
    .replace(/<(script|style|iframe|object|embed|form|input|button|select|textarea|link|meta|base)[\s>]/gi, "&lt;$1")
    .replace(/\son\w+\s*=/gi, " data-blocked=")
    .replace(/(href|src|xlink:href)\s*=\s*(["']?)\s*javascript:/gi, "$1=$2blocked:")
    .replace(/(href|src|xlink:href)\s*=\s*(["']?)\s*data:/gi, "$1=$2blocked:");
}
