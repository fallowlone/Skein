import copy
import sys
import unittest
from pathlib import Path
from xml.etree import ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from preview import compose as preview
from svg import document
from templates import compose


def loc(value):
    return {'en': value, 'ru': value}


def fixture(template):
    nodes = [{'id':f'n{i}', 'label':loc(f'Node {i}'), 'detail':loc('Short detail'),
              'role':'info', 'group':'general'} for i in range(4)]
    pairs = [(0,1),(1,2),(3,2)] if template=='relationships' else [(0,1),(1,2),(2,3)]
    edges = [{'id':f'e{i}', 'from':f'n{s}', 'to':f'n{t}', 'kind':'sequence', 'label':loc('Transition')}
             for i,(s,t) in enumerate(pairs)] if template!='comparison' else []
    return {'unit':'fixture','title':loc('A concise heading'), 'subtitle':loc('One learning objective'),
            'takeaway':loc('Keep the mechanism visible.'), 'learning_objective':loc('Fixture'),
            'template':template,'nodes':nodes,'edges':edges,
            'criteria':[{'id':'criterion','label':loc('Shared criterion'),
                         'cells':{n['id']:loc('A value') for n in nodes}}] if template=='comparison' else []}


def metric(text, size, weight):
    return len(text)*size*.45


class TemplateTests(unittest.TestCase):
    def test_all_templates_preserve_declared_visible_labels(self):
        for template in ('comparison','layers','flow','relationships'):
            with self.subTest(template=template):
                spec=fixture(template)
                shapes,texts=compose(spec,'en')
                svg=document('Title','Description','en',shapes,texts,metric)
                root=ET.fromstring(svg)
                visible=' '.join(' '.join(g.itertext()) for g in root.iter() if g.tag.endswith('}text'))
                for n in spec['nodes']:
                    self.assertIn(n['label']['en'],visible)
                    self.assertIn(n['detail']['en'],visible)
                for edge in spec['edges']:
                    self.assertIn(edge['label']['en'],visible)

    def test_preview_only_accepts_public_parameters(self):
        for locale in ('en','ru'):
            for template in ('comparison','layers','flow','relationships'):
                shapes,texts=preview(locale,template)
                svg=document('Preview','Preview',locale,shapes,texts,metric,width=800,height=600)
                root=ET.fromstring(svg)
                visible=[el.text for el in root.iter() if el.tag.endswith('}text')]
                self.assertEqual(visible,['SKEIN COACH','PREVIEW' if locale=='en' else 'ПРЕВЬЮ'])
        for args in [('de','flow'),('en','unknown')]:
            with self.assertRaises(ValueError):
                preview(*args)

    def test_escaping_is_text_not_markup(self):
        spec=fixture('flow')
        spec['nodes'][0]['label']=loc('<script>&"')
        shapes,texts=compose(spec,'en')
        svg=document('<script>','A & B','en',shapes,texts,metric)
        root=ET.fromstring(svg)
        self.assertFalse(any(el.tag.endswith('}script') for el in root.iter()))
        self.assertIn('&lt;script&gt;',svg)

    def test_unknown_topology_and_template_fail(self):
        spec=fixture('relationships')
        spec['edges'][0]['to']='n3'
        with self.assertRaises(ValueError):
            compose(spec,'en')
        spec['template']='unknown'
        with self.assertRaises(ValueError):
            compose(spec,'en')

    def test_bytes_are_deterministic(self):
        shapes,texts=compose(fixture('comparison'),'en')
        self.assertEqual(document('A','B','en',shapes,texts,metric),document('A','B','en',shapes,texts,metric))


if __name__=='__main__':
    unittest.main()
