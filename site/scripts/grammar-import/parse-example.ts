// Parse steep's "English text (Русский перевод)" example strings.
const CYR = /[А-Яа-яЁё]/;

export function parseExample(raw: string): { en: string; ru: string } {
  const s = raw.trim();
  // Find the last balanced "(...)" whose content contains Cyrillic.
  let depth = 0, open = -1, lastOpen = -1, lastClose = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") { if (depth === 0) open = i; depth++; }
    else if (s[i] === ")") {
      depth--;
      if (depth === 0 && open >= 0) {
        const inner = s.slice(open + 1, i);
        if (CYR.test(inner)) { lastOpen = open; lastClose = i; }
      }
    }
  }
  if (lastOpen >= 0) {
    return {
      en: s.slice(0, lastOpen).trim(),
      ru: s.slice(lastOpen + 1, lastClose).trim(),
    };
  }
  return { en: s, ru: "" };
}
