export function json(body: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function error(status: number, code: string, headers: HeadersInit = {}): Response {
  return json({ error: code }, status, headers);
}

// Content-Security-Policy delivered as a response HEADER. The site ALREADY enforces an identical
// policy via a <meta http-equiv> tag (site/src/lib/csp.ts buildCsp), proven in production — so
// mirroring it here is safe: it changes nothing the meta already binds and only ADDS the two
// header-only hardening directives a <meta> CSP cannot express (frame-ancestors, object-src).
// Delivering it as a header also makes it visible to scanners and makes frame-ancestors effective.
// MUST mirror buildCsp("wasm") in site/src/lib/csp.ts (the wasm variant is the per-page superset);
// keep the two in sync. 'unsafe-inline' is unavoidable while Astro bakes inline hydration scripts
// and styles into static HTML with no per-request nonce.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'", // wasm-unsafe-eval: transformers.js (whisper)
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: https://avatars.githubusercontent.com",
  "connect-src 'self' https://api.anthropic.com", // /api (self) + self-hosted /models/ weights + BYOK grader
  "worker-src 'self' blob:", // transformers.js worker
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'", // header-only (ignored in <meta>); supersedes X-Frame-Options on modern browsers
  "object-src 'none'", // header-only hardening
].join("; ");

export function withSecurityHeaders(res: Response): Response {
  const h = new Headers(res.headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("X-Frame-Options", "DENY"); // legacy fallback for browsers without frame-ancestors
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Enforce HTTPS for a year (no preload — kept reversible). CF terminates TLS for all custom domains.
  h.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  // Lock down powerful features the site never uses; keep the microphone for the speaking module.
  h.set(
    "Permissions-Policy",
    "accelerometer=(), camera=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()",
  );
  h.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  // Enforcing: this is the policy the site already runs under via <meta>, plus frame-ancestors/object-src.
  h.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
