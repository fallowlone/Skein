/// <reference types="@cloudflare/workers-types" />
// functions/models/[[path]].ts
// Serves Whisper model files same-origin from R2 so the page CSP stays
// connect-src 'self'. Read-only; long-cache immutable; 404 on miss.
interface Env { MODELS: R2Bucket; }

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const key = Array.isArray(params.path) ? params.path.join("/") : String(params.path ?? "");
  if (!key) return new Response("Not found", { status: 404 });
  const obj = await env.MODELS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
};
