import os
from pathlib import Path
import subprocess
import sys
import unittest


class RendererTimeoutTests(unittest.TestCase):
    @unittest.skipUnless(os.name == 'posix', 'process-group cleanup targets macOS/Linux')
    def test_stalled_reader_and_writer_are_bounded(self):
        root = str(Path(__file__).resolve().parents[1])
        for payload in (0, 2_000_000):
            code = f'''
import subprocess, sys
sys.path.insert(0, {root!r})
from generate import Renderer
r = Renderer()
r.request_timeout = .2
r.process = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, start_new_session=True)
try:
    try:
        r.request({{'data': 'x' * {payload}}})
        raise AssertionError('expected timeout')
    except RuntimeError as error:
        assert 'timed out' in str(error)
finally:
    r.__exit__()
assert r.process.returncode is not None
'''
            with self.subTest(payload=payload):
                result = subprocess.run([sys.executable, '-c', code],
                                        capture_output=True, text=True, timeout=5)
                self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == '__main__':
    unittest.main()
