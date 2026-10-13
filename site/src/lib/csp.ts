export type CspExtra = "wasm" | undefined;

/** Single source of truth for the page CSP. `wasm` adds only execution
 *  directives (WASM compile + workers); connect-src (the exfiltration channel)
 *  is never widened. */
export function buildCsp(extra?: CspExtra): string {
  const scriptSrc = extra === "wasm"
    ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";
  const parts = [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:", // Vite inlines sub-4KB fonts as data: URIs
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "connect-src 'self' https://api.anthropic.com",
    "base-uri 'self'",
    "form-action 'self' https://github.com", // login form POSTs to /api/auth/login, which 302s to github.com/oauth — Chromium checks form-action against the redirect target too
  ];
  if (extra === "wasm") parts.push("worker-src 'self' blob:");
  return parts.join("; ");
}
