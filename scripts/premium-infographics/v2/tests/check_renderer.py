"""Opt-in real-browser contract checks; run separately from stdlib discovery."""
import base64
from pathlib import Path
import struct
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from generate import Renderer
from layout import Box, Text
from svg import document


class RendererTests(unittest.TestCase):
    def test_font_readiness_geometry_safety_and_png(self):
        with Renderer() as renderer:
            items = [dict(text='Skein Проверка Ёё №', size=30, weight=w) for w in (500,600,700)]
            first = renderer.request(dict(op='measure', items=items))
            second = renderer.request(dict(op='measure', items=items))
            self.assertEqual(first['widths'], second['widths'])
            self.assertTrue(all(w > 0 for w in first['widths']))
            css, license_text = renderer.request(dict(op='assets'))['assets']
            text = Text('fixture', items[0]['text'], Box(50,50,700,80), 30, 500)
            svg = document('Fixture','Fixture','en',[],[text],lambda *_: first['widths'][0],
                           css,license_text,800,600)
            result = renderer.request(dict(op='verify',svg=svg,png=True))
            self.assertEqual(result['errors'], [])
            png = base64.b64decode(result['png'], validate=True)
            self.assertEqual(png[:8], b'\x89PNG\r\n\x1a\n')
            self.assertEqual(struct.unpack('>II',png[16:24]), (800,600))
            for source in (svg.replace('data-w="700"','data-w="1"'),
                           svg.replace('</svg>','<text x="0" y="30">Unboxed</text></svg>'),
                           svg.replace('<style>','<style>/* altered */'),
                           svg.replace('</svg>','<foreignObject/></svg>')):
                with self.subTest(source_category=source[-60:]):
                    invalid = renderer.request(dict(op='verify',svg=source,png=True))
                    self.assertTrue(invalid['errors'])
                    self.assertIsNone(invalid['png'])
            with self.assertRaisesRegex(RuntimeError,'unsupported-operation'):
                renderer.request(dict(op='unknown'))


if __name__ == '__main__':
    unittest.main()
