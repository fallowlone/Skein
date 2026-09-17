import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from layout import Box, Text, validate_boxes, wrap


def metric(value, size, weight):
    return len(value) * size / 2


class LayoutTests(unittest.TestCase):
    def test_wrap_preserves_mixed_language_copy(self):
        text = Text('ru', 'Версия API готова к запуску', Box(0, 0, 130, 140), 20)
        lines = wrap(text, metric)
        self.assertEqual(' '.join(lines), text.value)
        self.assertTrue(all(metric(line, 20, 500) <= 130 for line in lines))

    def test_unbreakable_token_fails(self):
        with self.assertRaisesRegex(ValueError, 'token'):
            wrap(Text('long', 'НеделимыйДлинныйТокен', Box(0, 0, 30, 200)), metric)

    def test_height_overflow_fails(self):
        with self.assertRaisesRegex(ValueError, 'height'):
            wrap(Text('height', 'one two three', Box(0, 0, 60, 25), 20), metric)

    def test_missing_metrics_fail(self):
        with self.assertRaises(KeyError):
            wrap(Text('missing', 'one', Box(0, 0, 100, 100)), lambda *args: {}[args])

    def test_boxes_reject_collision_duplicate_and_canvas_overflow(self):
        a = Text('a', 'A', Box(0, 0, 100, 100))
        for b in (Text('b', 'B', Box(90, 90, 100, 100)),
                  Text('a', 'B', Box(200, 0, 100, 100)),
                  Text('b', 'B', Box(1590, 0, 100, 100))):
            with self.assertRaises(ValueError):
                validate_boxes([a, b])
        validate_boxes([a, Text('b', 'B', Box(100, 0, 100, 100))])

    def test_candidates_include_all_possible_wrapped_lines(self):
        self.assertEqual(Text('a', 'a b c', Box(0, 0, 1, 1)).candidates(),
                         ['a', 'a b', 'a b c', 'b', 'b c', 'c'])


if __name__ == '__main__':
    unittest.main()
