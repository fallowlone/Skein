#!/usr/bin/env python3
"""Experimental v2 CLI. V1 remains the default until visual acceptance."""
import argparse
import base64
import hashlib
import json
import os
import signal
import threading
from pathlib import Path
import subprocess
import sys

from model import load
from output import publish
from preview import compose as compose_preview
from svg import document
from templates import compose, VERSION

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CONTENT = HERE / 'content/deployment.json'


class Renderer:
    request_timeout = 90

    def _terminate(self):
        try:
            if os.name == 'posix':
                os.killpg(self.process.pid, signal.SIGKILL)
            else:
                self.process.kill()
        except ProcessLookupError:
            pass

    def __enter__(self):
        self.process = subprocess.Popen(['node', str(HERE / 'render.mjs')],
                                        stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                                        text=True, encoding='utf-8', start_new_session=os.name == 'posix')
        return self

    def request(self, data):
        expired = threading.Event()
        def timeout():
            expired.set()
            self._terminate()
        watchdog = threading.Timer(self.request_timeout, timeout)
        watchdog.daemon = True
        watchdog.start()
        try:
            self.process.stdin.write(json.dumps(data, ensure_ascii=False)+'\n')
            self.process.stdin.flush()
            line = self.process.stdout.readline()
        finally:
            watchdog.cancel()
            watchdog.join()
            if expired.is_set():
                raise RuntimeError('renderer request timed out')
        if not line:
            raise RuntimeError('renderer stopped without a response; verify Node, Playwright and Chromium installation')
        result = json.loads(line)
        if not result.get('ok'):
            raise RuntimeError(f'renderer failed: {result.get("error", "unknown category")}')
        return result

    def __exit__(self, *_):
        try:
            self.process.stdin.close()
        except BrokenPipeError:
            pass
        try:
            self.process.wait(timeout=15)
        except subprocess.TimeoutExpired:
            self._terminate()
            self.process.wait()
        self.process.stdout.close()


def generate(data, units, locales, png=False):
    selected = [spec for spec in data['units'] if spec['unit'] in units]
    plans = []
    for spec in selected:
        for locale in locales:
            for preview in (False, True):
                shapes, texts = compose_preview(locale, spec['template']) if preview else compose(spec, locale)
                plans.append((spec,locale,preview,shapes,texts))
    keys = sorted({(candidate, text.size, text.weight)
                   for _,_,_,_,texts in plans for text in texts for candidate in text.candidates()})
    with Renderer() as renderer:
        metrics = renderer.request({'op':'measure','items':[dict(text=t,size=s,weight=w) for t,s,w in keys]})
        if len(metrics['widths']) != len(keys):
            raise RuntimeError('renderer returned incomplete metrics')
        widths = dict(zip(keys, metrics['widths']))
        css, license_text = renderer.request({'op':'assets'})['assets']
        files = {}
        for spec, locale, preview, shapes, texts in plans:
            label = 'PREVIEW' if locale == 'en' else 'ПРЕВЬЮ'
            svg = document(label if preview else spec['title'][locale],
                           label if preview else spec['learning_objective'][locale], locale,
                           shapes, texts, lambda t,s,w: widths[(t,s,w)],
                           css, license_text,
                           800 if preview else 1600, 600 if preview else 1200)
            verified = renderer.request({'op':'verify','svg':svg,'png':png})
            if verified.get('errors'):
                raise ValueError(f'{spec["unit"]}/{locale}: rendered geometry failed: {verified["errors"]}')
            name = f'{locale}/{spec["unit"]}.{"preview" if preview else "full"}'
            files[name+'.svg'] = svg.encode('utf-8')
            if png:
                files[name+'.png'] = base64.b64decode(verified['png'], validate=True)
    metadata = {'schema_version':2, 'template_version':VERSION,
                'scope': {'units':units,'locales':locales,
                          'complete_course':len(units)==len(data['units']) and locales==['en','ru']},
                'content_sha256':hashlib.sha256(json.dumps(data,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),
                'dimensions':{'full':[1600,1200],'preview':[800,600]},
                'renderer':metrics['provenance'], 'visual_acceptance':'pending', 'experimental':True}
    return files, metadata


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate data only; no browser or file writes')
    parser.add_argument('--unit', action='append', help='Select unit slug; repeatable')
    parser.add_argument('--locale', choices=['en','ru'], action='append')
    parser.add_argument('--output', type=Path, default=ROOT/'.premium-infographics/deployment-v2')
    parser.add_argument('--export-png', action='store_true')
    args = parser.parse_args()
    data = load(CONTENT, ROOT/'site/src/content/units.json')
    all_units = [spec['unit'] for spec in data['units']]
    units = sorted(set(args.unit or all_units))
    locales = sorted(set(args.locale or ['en','ru']))
    if not set(units) <= set(all_units):
        parser.error('unknown unit selection')
    if args.check:
        print(f'PASS: schema, canonical units and bilingual structure ({len(units)} selected units)')
        return
    destination = args.output.absolute()
    if destination.is_relative_to(ROOT) and not destination.is_relative_to(ROOT/'.premium-infographics'):
        parser.error('in-repository outputs must remain inside .premium-infographics/')
    files, metadata = generate(data, units, locales, args.export_png)
    active = publish(destination, files, metadata)
    print(f'PASS: {len(files)} private artifacts; active manifest: {active}; visual acceptance pending')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError) as error:
        print(f'ERROR: {error}', file=sys.stderr)
        sys.exit(1)
