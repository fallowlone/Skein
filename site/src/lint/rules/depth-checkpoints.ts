export function checkDepthCheckpoints(html: string, file: string): string[] {
  const m = html.match(/<html[^>]*data-depth=['"]([^'"]+)['"]/);
  if (!m) return []; // not a piece page
  let depth: Record<string, string>;
  try {
    // Astro encodes embedded quotes as HTML numeric entities (&#34;) — handle both that and the named &quot; plus &amp;.
    const decoded = m[1]
      .replace(/&#34;/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&");
    depth = JSON.parse(decoded);
  } catch {
    return [`${file}: data-depth JSON parse failed`];
  }
  const errs: string[] = [];
  for (const [key, id] of Object.entries(depth)) {
    if (typeof id !== "string") continue;
    if (id.startsWith("tbd-")) continue; // stub placeholders allowed
    const re = new RegExp(`id=['"]${id}['"]`);
    if (!re.test(html)) errs.push(`${file}: depth.${key} id="${id}" not found in DOM`);
  }
  return errs;
}
