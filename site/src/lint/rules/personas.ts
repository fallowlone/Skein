import personas from "../../content/personas.json";

export function checkPersonas(html: string, file: string): string[] {
  const errs: string[] = [];
  const known = new Set(Object.keys(personas as Record<string, unknown>));
  const re = /data-persona=['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!known.has(m[1])) errs.push(`${file}: unknown persona id "${m[1]}"`);
  }
  return errs;
}
