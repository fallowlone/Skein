"""Small, escaped SVG vocabulary; course data never supplies markup."""
from html import escape
from xml.etree import ElementTree as ET

from layout import wrap, validate_boxes

COLORS = {'info': '#315ca8', 'success': '#23765b', 'warning': '#986019', 'neutral': '#566273'}
FILLS = {'info': '#edf3ff', 'success': '#eaf6ef', 'warning': '#fff3df', 'neutral': '#f0f2f5'}


def rect(x, y, w, h, fill='#ffffff', stroke='#ced5df', radius=12):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{radius}" fill="{fill}" stroke="{stroke}"/>'


def path(points, color='#566273', dash='', arrow=False):
    coords = ' L '.join(f'{x} {y}' for x, y in points)
    dashed = f' stroke-dasharray="{dash}"' if dash else ''
    marker = ' marker-end="url(#arrow)"' if arrow else ''
    return f'<path d="M {coords}" fill="none" stroke="{color}" stroke-width="3"{dashed}{marker}/>'


def document(title, description, locale, shapes, texts, measure, css='', license_text='', width=1600, height=1200):
    if locale not in ('en', 'ru'):
        raise ValueError('unsupported locale')
    validate_boxes(texts, width, height)
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" lang="{locale}" role="img" aria-labelledby="title description">',
             f'<title id="title">{escape(title)}</title><desc id="description">{escape(description)}</desc>',
             f'<metadata>{escape(license_text)}</metadata>', f'<style>{escape(css)}</style>',
             '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#566273"/></marker></defs>',
             rect(0, 0, width, height, '#f7f8fa', '#f7f8fa', 0), *shapes]
    for text in texts:
        b = text.box
        parts.append(f'<g id="{escape(text.id, quote=True)}" data-text-box="true" data-x="{b.x}" data-y="{b.y}" data-w="{b.w}" data-h="{b.h}" fill="{text.color}" font-family="Inter Tight Variable" font-size="{text.size}" font-weight="{text.weight}">')
        for index, line in enumerate(wrap(text, measure)):
            y = b.y + text.size + index * text.size * 1.25
            parts.append(f'<text x="{b.x}" y="{y}">{escape(line)}</text>')
        parts.append('</g>')
    parts.append('</svg>')
    result = ''.join(parts)
    ET.fromstring(result)
    return result
