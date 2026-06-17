// Prose — a tiny Markdown renderer for the grammar teaching copy. The authored
// explain prose (RU primary) is Markdown — bold, inline code, bullet/ordered
// lists, GFM tables, and the odd blockquote — so dumping it into a <p> showed raw
// `**` and `|` syntax. This parses the exact subset the corpus uses (no headings,
// no links) into Preact vnodes. Input is authored content, not user input, so
// there is no injection surface; nothing is dangerouslySetInnerHTML'd.
import type { ComponentChildren, VNode } from "preact";

// Inline: **bold** and `code`. Everything else is literal text (arrows, ✅/❌).
function inline(text: string): ComponentChildren[] {
  const out: ComponentChildren[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={k++}>{m[1]}</strong>);
    else out.push(<code key={k++}>{m[2]}</code>);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isSep = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes("-");
const isQuote = (l: string) => /^\s*>\s?/.test(l);
const isOl = (l: string) => /^\s*\d+\.\s+/.test(l);
const isUl = (l: string) => /^\s*[-*]\s+/.test(l);
const cells = (l: string) =>
  l.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());

export function Prose({ md }: { md: string }): VNode {
  const lines = md.replace(/\r/g, "").split("\n");
  const blocks: VNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    // GFM table — header row, separator row, then body rows
    if (isRow(line) && i + 1 < lines.length && isSep(lines[i + 1])) {
      const header = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isRow(lines[i])) {
        rows.push(cells(lines[i]));
        i++;
      }
      blocks.push(
        <table key={key++}>
          <thead>
            <tr>{header.map((c, j) => <th key={j}>{inline(c)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c)}</td>)}</tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }

    if (isQuote(line)) {
      const buf: string[] = [];
      while (i < lines.length && isQuote(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(<blockquote key={key++}>{inline(buf.join(" "))}</blockquote>);
      continue;
    }

    if (isOl(line)) {
      const items: string[] = [];
      while (i < lines.length && isOl(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push(<ol key={key++}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ol>);
      continue;
    }

    if (isUl(line)) {
      const items: string[] = [];
      while (i < lines.length && isUl(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(<ul key={key++}>{items.map((it, j) => <li key={j}>{inline(it)}</li>)}</ul>);
      continue;
    }

    // paragraph — gather consecutive plain lines
    const buf: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isRow(lines[i]) &&
      !isQuote(lines[i]) &&
      !isOl(lines[i]) &&
      !isUl(lines[i])
    ) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{inline(buf.join(" "))}</p>);
  }

  return <>{blocks}</>;
}
