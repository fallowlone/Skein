import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(path.join(root, 'site/package.json'));
const { chromium } = require('playwright');
const fontRoot = path.join(root, 'site/node_modules/@fontsource-variable/inter-tight');
const installedCss = await readFile(path.join(fontRoot, 'wght.css'), 'utf8');
const license = await readFile(path.join(fontRoot, 'LICENSE'), 'utf8');
assert.ok(license.includes('SIL OPEN FONT LICENSE Version 1.1'));
const subsets = ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'];
const fonts = {};
const rules = [];
for (const subset of subsets) {
  const file = `inter-tight-${subset}-wght-normal.woff2`;
  const bytes = await readFile(path.join(fontRoot, 'files', file));
  const rule = installedCss.split('@font-face').find(rule => rule.includes(`./files/${file}`));
  assert.ok(rule, 'installed font rule missing');
  const range = rule.match(/unicode-range:\s*([^;]+);/)[1];
  fonts[file] = createHash('sha256').update(bytes).digest('hex');
  rules.push(`@font-face{font-family:'Inter Tight Variable';font-style:normal;font-weight:100 900;src:url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');unicode-range:${range};}`);
}
const css = rules.join('\n');
const browser = await chromium.launch({ headless: true });
const provenance = { chromium: browser.version(), playwright: require('playwright/package.json').version,
  node: process.version, platform: process.platform, arch: process.arch, fonts };
const respond = value => process.stdout.write(JSON.stringify(value) + '\n');
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
  await page.route('**/*', route => route.abort());
  await page.setContent('<!doctype html><style>body{margin:0}svg{display:block}</style>');
  await page.addStyleTag({ content: css });
  async function loadFonts() {
    await page.evaluate(async () => {
      for (const weight of [500, 600, 700]) {
        const loaded = await document.fonts.load(`${weight} 30px "Inter Tight Variable"`, 'Skein Проверка Ёё №');
        if (loaded.length < 2) throw new Error('font-readiness');
      }
      await document.fonts.ready;
    });
  }
  await loadFonts();
  for await (const line of createInterface({ input: process.stdin, terminal: false })) {
    try {
      const request = JSON.parse(line);
      if (request.op === 'assets') {
        respond({ ok: true, assets: [css, license], provenance });
      } else if (request.op === 'measure') {
        assert.ok(Array.isArray(request.items));
        for (const item of request.items) {
          assert.equal(typeof item.text, 'string');
          assert.ok(Number.isFinite(item.size) && item.size >= 20 && item.size <= 60);
          assert.ok([500, 600, 700].includes(item.weight));
        }
        await loadFonts();
        const widths = await page.evaluate(items => {
          const context = document.createElement('canvas').getContext('2d');
          return items.map(({ text, size, weight }) => {
            context.font = `${weight} ${size}px "Inter Tight Variable"`;
            return Math.ceil(context.measureText(text).width * 100) / 100;
          });
        }, request.items);
        respond({ ok: true, widths, provenance });
      } else if (request.op === 'verify') {
        const errors = await page.evaluate(async ({ source, trustedCss }) => {
          const fail = (category, id = 'document') => [{ id, category }];
          if (typeof source !== 'string' || /<!DOCTYPE|<!ENTITY/i.test(source)) return fail('invalid-xml');
          const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
          if (parsed.querySelector('parsererror')) return fail('invalid-xml');
          const svg = parsed.documentElement;
          if (svg.localName !== 'svg' || svg.namespaceURI !== 'http://www.w3.org/2000/svg') return fail('invalid-svg');
          const width = Number(svg.getAttribute('width')), height = Number(svg.getAttribute('height'));
          if (!((width === 1600 && height === 1200) || (width === 800 && height === 600))) return fail('invalid-canvas');
          if (svg.getAttribute('viewBox') !== `0 0 ${width} ${height}`) return fail('invalid-viewbox');
          const allowedTags = new Set(['svg', 'title', 'desc', 'metadata', 'style', 'defs', 'marker', 'path', 'rect', 'g', 'text']);
          const allowedAttributes = new Set(['xmlns', 'width', 'height', 'viewBox', 'lang', 'role', 'aria-labelledby', 'id', 'x', 'y', 'rx', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'd', 'marker-end', 'refX', 'refY', 'markerWidth', 'markerHeight', 'orient', 'data-text-box', 'data-x', 'data-y', 'data-w', 'data-h', 'font-family', 'font-size', 'font-weight']);
          const ids = new Set();
          for (const el of [svg, ...svg.querySelectorAll('*')]) {
            if (!allowedTags.has(el.localName)) return fail('unsafe-element');
            if (el.id && ids.has(el.id)) return fail('duplicate-id');
            if (el.id) ids.add(el.id);
            for (const attr of el.attributes) {
              if (!allowedAttributes.has(attr.name)) return fail('unsafe-attribute');
              if (/url\s*\(/i.test(attr.value) && !(attr.name === 'marker-end' && attr.value === 'url(#arrow)')) return fail('unsafe-resource');
            }
          }
          const styles = svg.querySelectorAll('style');
          if (styles.length !== 1 || styles[0].textContent !== trustedCss) return fail('untrusted-stylesheet');
          document.body.replaceChildren(document.importNode(svg, true));
          for (const weight of [500, 600, 700]) {
            await document.fonts.load(`${weight} 30px "Inter Tight Variable"`, 'Skein Проверка Ёё №');
          }
          await document.fonts.ready;
          const element = document.querySelector('svg');
          const groups = [...element.querySelectorAll('[data-text-box]')];
          const rects = [];
          for (const group of groups) {
            const [x, y, w, h] = ['x', 'y', 'w', 'h'].map(key => Number(group.getAttribute(`data-${key}`)));
            if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return fail('invalid-text-box', group.id);
            const b = group.getBBox(), epsilon = 1;
            if (b.x < x-epsilon || b.y < y-epsilon || b.x+b.width > x+w+epsilon || b.y+b.height > y+h+epsilon) return fail('text-overflow', group.id);
            for (const previous of rects) {
              if (b.x < previous.x+previous.width && previous.x < b.x+b.width && b.y < previous.y+previous.height && previous.y < b.y+b.height) return fail('text-collision', group.id);
            }
            rects.push(b);
          }
          for (const text of element.querySelectorAll('text')) {
            const b = text.getBBox();
            if (!text.closest('[data-text-box]')) return fail('unboxed-text');
            if (b.x < 0 || b.y < 0 || b.x+b.width > width || b.y+b.height > height) return fail('canvas-overflow');
          }
          return [];
        }, { source: request.svg, trustedCss: css });
        let png = null;
        if (!errors.length && request.png) {
          png = (await page.locator('svg').screenshot({ type: 'png' })).toString('base64');
        }
        respond({ ok: true, errors, png, provenance });
      } else {
        respond({ ok: false, error: 'unsupported-operation' });
      }
    } catch {
      respond({ ok: false, error: 'renderer-request-failed' });
    }
  }
} finally {
  await browser.close();
}
