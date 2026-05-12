#!/usr/bin/env bash
# svg-to-png.sh <input.svg> [output.png]
#
# Renders an SVG to PNG using the best available tool on the system, preferring
# higher-quality renderers first. On macOS, qlmanage is always present as a
# last resort. The output PNG lands next to assets/exports/<slug>/ unless an
# explicit destination is given.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: svg-to-png.sh <input.svg> [output.png]" >&2
  exit 2
fi

INPUT="$1"
if [[ ! -f "$INPUT" ]]; then
  echo "error: $INPUT not found" >&2
  exit 1
fi

# Derive output path. Convention: infographics/<slug>/infographic.svg → assets/exports/<slug>/infographic.png
if [[ $# -ge 2 ]]; then
  OUTPUT="$2"
else
  SLUG="$(basename "$(dirname "$INPUT")")"
  OUTPUT="assets/exports/${SLUG}/$(basename "${INPUT%.svg}.png")"
fi

mkdir -p "$(dirname "$OUTPUT")"

render_with_rsvg() {
  rsvg-convert -o "$OUTPUT" "$INPUT"
}

render_with_inkscape() {
  inkscape "$INPUT" --export-type=png --export-filename="$OUTPUT" >/dev/null
}

render_with_chrome() {
  # Try common Chrome/Chromium binaries on macOS.
  local chrome=""
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"; do
    if [[ -x "$candidate" ]]; then chrome="$candidate"; break; fi
  done
  [[ -z "$chrome" ]] && return 1

  # Wrap the SVG in an HTML host so Chrome respects its intrinsic size.
  local tmp
  tmp="$(mktemp -d)"
  local html="$tmp/host.html"
  cp "$INPUT" "$tmp/in.svg"
  cat > "$html" <<HTML
<!doctype html><html><body style="margin:0">
<img src="in.svg" id="img" />
<script>
  const img = document.getElementById('img');
  img.onload = () => { document.title = img.naturalWidth + 'x' + img.naturalHeight; };
</script>
</body></html>
HTML
  # Use the SVG's viewBox/width to size the window. Default 1600x900.
  local size
  size="$(grep -m1 -Eo 'width="[0-9.]+"\s+height="[0-9.]+"' "$INPUT" || true)"
  local w=1600 h=900
  if [[ -n "$size" ]]; then
    w="$(echo "$size" | grep -m1 -Eo 'width="[0-9.]+"' | grep -Eo '[0-9.]+')"
    h="$(echo "$size" | grep -m1 -Eo 'height="[0-9.]+"' | grep -Eo '[0-9.]+')"
  fi
  "$chrome" --headless --disable-gpu --hide-scrollbars \
    --window-size="${w%.*},${h%.*}" \
    --screenshot="$OUTPUT" "file://$html" >/dev/null 2>&1
  rm -rf "$tmp"
  [[ -f "$OUTPUT" ]]
}

render_with_qlmanage() {
  local tmp
  tmp="$(mktemp -d)"
  qlmanage -t -s 1600 -o "$tmp" "$INPUT" >/dev/null 2>&1
  local generated="$tmp/$(basename "$INPUT").png"
  [[ -f "$generated" ]] || return 1
  mv "$generated" "$OUTPUT"
  rm -rf "$tmp"
}

if command -v rsvg-convert >/dev/null; then
  echo "rendering with rsvg-convert → $OUTPUT"
  render_with_rsvg
elif command -v inkscape >/dev/null; then
  echo "rendering with inkscape → $OUTPUT"
  render_with_inkscape
elif render_with_chrome; then
  echo "rendered with headless Chrome → $OUTPUT"
elif command -v qlmanage >/dev/null && render_with_qlmanage; then
  echo "rendered with qlmanage (fallback, lower quality) → $OUTPUT"
else
  echo "error: no SVG renderer available. Install one: brew install librsvg" >&2
  exit 1
fi

echo "done: $OUTPUT"
