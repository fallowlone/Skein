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
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self' https://api.anthropic.com",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (extra === "wasm") parts.push("worker-src 'self' blob:");
  return parts.join("; ");
}
