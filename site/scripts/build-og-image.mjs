#!/usr/bin/env bun
// Generate the social share card (public/og.png, 1200×630) from an inline SVG via sharp.
// Run: bun scripts/build-og-image.mjs  — commit the resulting public/og.png.
// Text renders in a system serif/sans (librsvg has no access to the web fonts), which is fine for
// a share card — the layout + palette carry the brand. Regenerate if the wordmark/tagline changes.
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const W = 1200, H = 630;
const ink = "#1b1815", paper = "#f4efe5", accent = "#b5532e", muted = "#6b6258", hair = "#d8d0c2";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${paper}"/>
  <!-- faint contour lines for the cartographic editorial feel -->
  <g stroke="${hair}" stroke-width="1.5" fill="none" opacity="0.55">
    <path d="M0 120 C 220 90, 360 170, 600 140 S 980 100, 1200 150"/>
    <path d="M0 210 C 240 180, 380 260, 620 230 S 1000 190, 1200 240"/>
    <path d="M0 470 C 240 440, 420 520, 660 490 S 1010 450, 1200 500"/>
    <path d="M0 560 C 240 530, 420 610, 660 580 S 1010 540, 1200 590"/>
  </g>
  <!-- accent rule, top-left brand bar -->
  <rect x="90" y="96" width="10" height="120" fill="${ink}"/>
  <text x="124" y="150" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="${muted}" letter-spacing="1">CURRICULUM · fallowlone.com</text>
  <text x="120" y="300" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="118" fill="${ink}">Skein</text>
  <text x="124" y="372" font-family="Georgia, 'Times New Roman', serif" font-size="44" fill="${accent}">Senior fullstack, learned to depth.</text>
  <line x1="124" y1="430" x2="1080" y2="430" stroke="${hair}" stroke-width="2"/>
  <text x="124" y="492" font-family="-apple-system, Helvetica, Arial, sans-serif" font-size="30" fill="${muted}">16 pillars · adaptive path · spaced-repetition review · mock interviews</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(new URL("../public/og.png", import.meta.url), png);
console.log(`og.png written (${(png.length / 1024).toFixed(0)} KB, ${W}×${H})`);
