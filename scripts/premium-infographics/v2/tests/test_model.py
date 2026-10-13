import copy
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from model import load, validate

HERE = Path(__file__).resolve().parents[1]


class ModelTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = load(HERE/'content/deployment.json')

    def test_complete_corpus(self):
        self.assertEqual(len(self.data['units']),11)
        self.assertEqual({u['template'] for u in self.data['units']},
                         {'flow','comparison','layers','relationships'})
        self.assertIs(validate(self.data), self.data)

    def test_bad_version_unknown_fields_and_missing_locale(self):
        for change in (lambda d: d.update(schema_version=True),
                       lambda d: d.update(schema_version=1),
                       lambda d: d.update(svg='<script/>'),
                       lambda d: d['units'][0]['title'].pop('ru'),
                       lambda d: d['units'][0]['title'].update(de='Title'),
                       lambda d: d['units'][0].update(template='unknown')):
            data=copy.deepcopy(self.data)
            change(data)
            with self.assertRaises(ValueError):
                validate(data)

    def test_duplicate_ids_dangling_edges_and_bad_slug(self):
        for change in (lambda u: u['nodes'][1].update(id=u['nodes'][0]['id']),
                       lambda u: u['edges'][0].update(to='missing'),
                       lambda u: u.update(unit='../../escape'),
                       lambda u: u['nodes'].append(copy.deepcopy(u['nodes'][0])),
                       lambda u: u['nodes'][0].update(role='unknown'),
                       lambda u: u['edges'][0].update(kind='unknown')):
            data=copy.deepcopy(self.data)
            unit=next(u for u in data['units'] if u['template']=='flow')
            change(unit)
            with self.assertRaises(ValueError):
                validate(data)

    def test_comparison_cells_and_capacity(self):
        data=copy.deepcopy(self.data)
        unit=next(u for u in data['units'] if u['template']=='comparison')
        unit['criteria'][0]['cells'].pop(unit['nodes'][0]['id'])
        with self.assertRaises(ValueError):
            validate(data)
        data=copy.deepcopy(self.data)
        data['units'].pop()
        with self.assertRaises(ValueError):
            validate(data)

    def test_rollout_downtime_and_four_strategies(self):
        unit = next(u for u in self.data['units'] if u['unit']=='04-rollout-strategies')
        self.assertEqual({n['id'] for n in unit['nodes']},
                         {'rolling','blue-green','canary','recreate'})
        for change in (lambda n: n.update(downtime=[False,1,False]),
                       lambda n: n.update(downtime=[True]),
                       lambda n: n.update(states=[0,10,100]),
                       lambda n: n.pop('states')):
            data=copy.deepcopy(self.data)
            unit=next(u for u in data['units'] if u['unit']=='04-rollout-strategies')
            node=next(n for n in unit['nodes'] if n['id']=='recreate')
            change(node)
            with self.assertRaises(ValueError):
                validate(data)

    def test_duplicate_json_keys_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            file=Path(directory)/'bad.json'
            file.write_text('{"schema_version":2,"schema_version":2,"units":[]}',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'duplicate object key'):
                load(file)

    def test_controls_and_source_credentials_rejected(self):
        for field,value in [('title',{'en':'bad\x00text','ru':'Текст'}),
                            ('sources',['https://user:password@example.com/docs'])]:
            data=copy.deepcopy(self.data)
            data['units'][0][field]=value
            with self.assertRaises(ValueError):
                validate(data)


if __name__=='__main__':
    unittest.main()
