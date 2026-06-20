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
    "font-src 'self'",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "connect-src 'self' https://api.anthropic.com",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (extra === "wasm") parts.push("worker-src 'self' blob:");
  return parts.join("; ");
}
