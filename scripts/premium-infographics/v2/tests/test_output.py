"""Publication contract tests; no renderer or third-party packages required."""
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import output


class OutputTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        # macOS /var is itself a symlink; use the real temporary parent.
        self.root = Path(self.temp.name).resolve()
        self.destination = self.root / 'private'
        self.files = {'en/01-images.full.svg': b'<svg>full</svg>',
                      'en/01-images.preview.svg': b'<svg>preview</svg>',
                      'ru/01-images.full.png': b'\x89PNG\x00',
                      'ru/01-images.preview.png': b'\x89PNG\x01'}
        self.metadata = {'scope': {'units': ['01-images'], 'locales': ['en'],
                                   'complete_course': False},
                         'renderer': {'version': '1', 'font': 'test'}}

    def publish(self, files=None, metadata=None):
        return output.publish(self.destination, self.files if files is None else files,
                              self.metadata if metadata is None else metadata)

    def generation(self):
        manifest = json.loads((self.destination / 'active.json').read_bytes())
        return self.destination / 'generations' / manifest['generation']

    def test_manifest_and_scope_are_preserved_without_inference(self):
        active = self.publish()
        self.assertEqual(active, self.destination / 'active.json')
        raw = active.read_bytes()
        manifest = json.loads(raw)
        self.assertEqual(set(manifest), {'schema_version', 'generation', 'files', 'metadata'})
        self.assertEqual(manifest['metadata'], self.metadata)
        self.assertEqual(raw, (self.generation() / 'manifest.json').read_bytes())
        for name, data in self.files.items():
            self.assertEqual(manifest['files'][name],
                             {'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()})
            self.assertEqual((self.generation() / name).read_bytes(), data)

    def test_deterministic_across_order_and_destination(self):
        first = self.publish().read_bytes()
        metadata = {'renderer': {'font': 'test', 'version': '1'}, 'scope': self.metadata['scope']}
        reversed_files = dict(reversed(list(self.files.items())))
        self.assertEqual(first, self.publish(reversed_files, metadata).read_bytes())
        other = output.publish(self.root / 'other', reversed_files, metadata)
        self.assertEqual(first, other.read_bytes())
        self.assertEqual(len(list((self.destination / 'generations').iterdir())), 1)

    def test_every_byte_and_metadata_affect_generation_old_generations_remain(self):
        first = self.publish().read_bytes()
        original = self.generation()
        modified = {**self.files, 'en/01-images.full.svg': b'<svg>FULL</svg>'}
        second = self.publish(modified).read_bytes()
        third = self.publish(modified, {**self.metadata, 'scope': {'complete_course': True}}).read_bytes()
        self.assertNotEqual(first, second)
        self.assertNotEqual(second, third)
        self.assertEqual((original / 'manifest.json').read_bytes(), first)
        self.assertEqual(len(list((self.destination / 'generations').iterdir())), 3)

    def test_late_failure_preserves_active_and_previous_generation(self):
        before = self.publish().read_bytes()
        original = self.generation()
        def interrupted(source, destination):
            pending = json.loads(Path(source).read_bytes())
            ready = self.destination / 'generations' / pending['generation']
            self.assertEqual((ready / 'manifest.json').read_bytes(), Path(source).read_bytes())
            for name in pending['files']:
                self.assertTrue((ready / name).is_file())
            raise OSError('injected late failure')
        with patch.object(output.os, 'replace', side_effect=interrupted):
            with self.assertRaisesRegex(OSError, 'late failure'):
                self.publish({**self.files, 'en/01-images.full.svg': b'new'})
        self.assertEqual((self.destination / 'active.json').read_bytes(), before)
        self.assertEqual((original / 'manifest.json').read_bytes(), before)
        self.assertFalse(list(self.destination.glob('.publish-*')))
        self.publish({**self.files, 'en/01-images.full.svg': b'new'})
        self.assertNotEqual((self.destination / 'active.json').read_bytes(), before)

    def test_interrupted_staging_does_not_change_active(self):
        before = self.publish().read_bytes()
        with patch.object(output, '_write', side_effect=KeyboardInterrupt):
            with self.assertRaises(KeyboardInterrupt):
                self.publish({**self.files, 'en/01-images.full.svg': b'new'})
        self.assertEqual((self.destination / 'active.json').read_bytes(), before)
        self.assertEqual(len(list((self.destination / 'generations').iterdir())), 1)

    def test_traversal_and_noncanonical_paths_fail_before_writes(self):
        invalid = ['../secret', '/en/a.full.svg', 'en/../a.full.svg',
                   'en/a/b.full.svg', 'en//a.full.svg', './en/a.full.svg',
                   'en\\a.full.svg', 'en/.a.full.svg', 'en/a..full.svg',
                   'en/a.full.svg\n', 'en/a.full.svg\x00', 'en/a.FULL.svg',
                   'de/a.full.svg', 'EN/a.full.svg', 'en/а.full.svg',
                   'en/a.svg', 'en/a.full.webp', 'manifest.json',
                   'en/%2e%2e.full.svg', 'en/-a.full.svg']
        for name in invalid:
            with self.subTest(name=name), self.assertRaises(ValueError):
                self.publish({name: b'private'})
        self.assertFalse(self.destination.exists())

    def test_invalid_values_do_not_create_output(self):
        for files, metadata in [({'en/a.full.svg': 'text'}, {}), (self.files, {'x': float('nan')})]:
            with self.assertRaises(ValueError):
                self.publish(files, metadata)
        self.assertFalse(self.destination.exists())

    def test_private_repository_boundary(self):
        repo = self.root / 'repo'
        repo.mkdir()
        with patch.object(output, 'ROOT', repo):
            for path in [repo, repo / 'site/public', repo / '.premium-infographics-extra',
                         repo / '.premium-infographics/../site/public']:
                with self.subTest(path=path), self.assertRaises(ValueError):
                    output.publish(path, self.files, self.metadata)
            active = output.publish(repo / '.premium-infographics/test', self.files, self.metadata)
            self.assertTrue(active.is_file())

    def test_symlink_output_and_ancestor_rejected_including_dangling(self):
        real = self.root / 'real'
        real.mkdir()
        for destination in [real, self.root / 'missing']:
            link = self.root / 'link'
            link.symlink_to(destination, target_is_directory=True)
            for path in [link, link / 'nested/output']:
                with self.subTest(path=path), self.assertRaisesRegex(ValueError, 'symlink'):
                    output.publish(path, self.files, self.metadata)
            link.unlink()
        self.assertEqual(list(real.iterdir()), [])

    def test_symlink_generations_and_active_are_rejected(self):
        self.destination.mkdir()
        foreign = self.root / 'foreign'
        foreign.mkdir()
        for name, target in [('generations', foreign), ('active.json', foreign / 'absent')]:
            link = self.destination / name
            link.symlink_to(target)
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'symlink'):
                self.publish()
            self.assertTrue(link.is_symlink())
            link.unlink()
        self.assertEqual(list(foreign.iterdir()), [])

    def test_existing_generation_is_never_repaired_or_overwritten(self):
        before = self.publish().read_bytes()
        generation = self.generation()
        for mutation in ('bytes', 'manifest', 'extra', 'missing', 'empty', 'symlink-file',
                         'symlink-locale', 'symlink-generation'):
            with self.subTest(mutation=mutation):
                if generation.is_symlink():
                    generation.unlink()
                elif generation.exists():
                    shutil.rmtree(generation)
                generation.mkdir()
                for name, data in self.files.items():
                    file = generation / name
                    file.parent.mkdir(exist_ok=True)
                    file.write_bytes(data)
                (generation / 'manifest.json').write_bytes(before)
                if mutation == 'bytes':
                    (generation / 'en/01-images.full.svg').write_bytes(b'foreign')
                elif mutation == 'manifest':
                    (generation / 'manifest.json').write_bytes(b'{}')
                elif mutation == 'extra':
                    (generation / 'foreign').mkdir()
                elif mutation == 'missing':
                    (generation / 'en/01-images.full.svg').unlink()
                elif mutation == 'empty':
                    shutil.rmtree(generation)
                    generation.mkdir()
                elif mutation == 'symlink-file':
                    file = generation / 'en/01-images.full.svg'
                    file.unlink()
                    file.symlink_to(self.root / 'absent')
                elif mutation == 'symlink-locale':
                    shutil.rmtree(generation / 'en')
                    (generation / 'en').symlink_to(self.root / 'absent')
                else:
                    shutil.rmtree(generation)
                    generation.symlink_to(self.root / 'absent')
                with self.assertRaises(ValueError):
                    self.publish()
                self.assertEqual((self.destination / 'active.json').read_bytes(), before)
                if mutation == 'empty':
                    self.assertEqual(list(generation.iterdir()), [])
                if mutation == 'bytes':
                    self.assertEqual((generation / 'en/01-images.full.svg').read_bytes(), b'foreign')


if __name__ == '__main__':
    unittest.main()
