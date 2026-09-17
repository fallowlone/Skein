"""Structural checks only; these do not replace visual acceptance."""

import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

import generate_deployment as generator


NS = "{http://www.w3.org/2000/svg}"


class DeploymentTests(unittest.TestCase):
    def test_curriculum_units_and_locales(self):
        units = json.loads(
            (generator.ROOT / "site/src/content/units.json").read_text(encoding="utf-8")
        )
        expected = [unit["slug"] for unit in units if unit["track"] == "deployment"]
        self.assertEqual([item["unit"] for item in generator.COURSE], expected)
        self.assertEqual(len(expected), len(set(expected)))
        for item in generator.COURSE:
            self.assertEqual(set(item), {"unit", "en", "ru"})
            self.assertEqual(
                [panel[1] for panel in item["en"]["panels"]],
                [panel[1] for panel in item["ru"]["panels"]],
            )
            for locale in ("en", "ru"):
                spec = item[locale]
                self.assertEqual(len(spec["panels"]), 4)
                for field in ("title", "subtitle", "lens"):
                    self.assertTrue(spec[field].strip())
                for title, kind, bullets in spec["panels"]:
                    self.assertTrue(title.strip())
                    self.assertTrue(kind.strip())
                    self.assertEqual(len(bullets), 2)
                    self.assertTrue(all(bullet.strip() for bullet in bullets))

    def test_full_svg_preserves_all_copy(self):
        for item in generator.COURSE:
            for locale in ("en", "ru"):
                with self.subTest(unit=item["unit"], locale=locale):
                    spec = item[locale]
                    root = ET.fromstring(generator.render_svg(locale, item["unit"], spec))
                    self.assertEqual(root.tag, NS + "svg")
                    self.assertEqual(root.attrib["viewBox"], "0 0 1600 1200")
                    self.assertEqual(root.attrib["width"], "1600")
                    self.assertEqual(root.attrib["height"], "1200")
                    blocks = [
                        " ".join("".join(span.itertext()) for span in node)
                        for node in root.iter(NS + "text")
                    ]
                    expected = [spec[field] for field in ("title", "subtitle", "lens")]
                    for title, _, bullets in spec["panels"]:
                        expected.extend([title, *bullets])
                    for text in expected:
                        self.assertIn(" ".join(text.split()), blocks)

    def test_preview_contains_only_public_labels(self):
        for locale, label in (("en", "PREVIEW"), ("ru", "ПРЕВЬЮ")):
            root = ET.fromstring(generator.render_preview_svg(locale))
            self.assertEqual(root.attrib["width"], "800")
            self.assertEqual(root.attrib["height"], "600")
            text = [part.strip() for part in root.itertext() if part.strip()]
            self.assertEqual(text, ["SKEIN COACH", label])
            self.assertFalse(list(root.iter(NS + "image")))
            self.assertFalse(list(root.iter(NS + "script")))
            for node in root.iter():
                self.assertFalse(any("href" in key for key in node.attrib))
            blurred = root.find(NS + "g")
            self.assertEqual(blurred.attrib["filter"], "url(#preview-blur)")
            self.assertFalse(list(blurred.iter(NS + "text")))

    def test_generation_is_complete_and_deterministic(self):
        with tempfile.TemporaryDirectory(prefix="skein-infographics-test-") as directory:
            root = Path(directory)
            output = root / "deployment"
            with patch.object(generator, "ROOT", root), patch.object(generator, "OUT", output):
                with contextlib.redirect_stdout(io.StringIO()):
                    generator.main()
                first = {path.relative_to(output): path.read_bytes() for path in output.rglob("*") if path.is_file()}
                expected = {
                    Path(locale) / f"{item['unit']}{suffix}.svg"
                    for item in generator.COURSE
                    for locale in ("en", "ru")
                    for suffix in ("", ".preview")
                }
                self.assertEqual(set(first), expected)
                self.assertEqual(len(first), 44)
                for payload in first.values():
                    ET.fromstring(payload)
                with contextlib.redirect_stdout(io.StringIO()):
                    generator.main()
                second = {path.relative_to(output): path.read_bytes() for path in output.rglob("*") if path.is_file()}
                self.assertEqual(first, second)

    def test_docker_layers_do_not_claim_every_instruction_adds_a_layer(self):
        spec = next(item for item in generator.COURSE if item["unit"] == "01-image-layers")
        self.assertEqual(spec["en"]["panels"][0][2][0], "RUN, COPY and ADD can create filesystem layers")
        self.assertEqual(spec["ru"]["panels"][0][2][0], "RUN, COPY и ADD создают filesystem-слои")

    def test_text_escaping_and_title_limits(self):
        root = ET.fromstring(generator.svg_text(['A < B & "C"'], 0, 0, 18))
        self.assertEqual("".join(root.itertext()), 'A < B & "C"')
        for item in generator.COURSE:
            for locale in ("en", "ru"):
                lines, size, _, _, _ = generator.title_layout(item[locale]["title"])
                self.assertLessEqual(len(lines), 2)
                self.assertTrue(all(generator.estimated_text_width(line, size, 800) <= 1190 for line in lines))
        with self.assertRaises(ValueError):
            generator.title_layout("W" * 1000)


if __name__ == "__main__":
    unittest.main()
