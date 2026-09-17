"""Deterministic, private generation publishing; active.json is the commit point.

Readers use active.json's generation and files, never directory enumeration.
Publication requires a trusted output directory (not writable by other users).
Failed publication may leave an unreferenced generation; generations are never
removed or repaired automatically.
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import tempfile


ROOT = Path(__file__).resolve().parents[3]
FILE_PATH = re.compile(r"(?:en|ru)/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:full|preview)\.(?:svg|png)", re.ASCII)


def _check_path(path: Path, *, directory: bool = False) -> None:
    """Check every existing component, including dangling symlinks."""
    for component in (*reversed(path.parents), path):
        try:
            mode = component.lstat().st_mode
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(mode):
            raise ValueError(f"symlink output path is forbidden: {component}")
        if component != path or directory:
            if not stat.S_ISDIR(mode):
                raise ValueError(f"output parent is not a directory: {component}")
        elif not stat.S_ISREG(mode):
            raise ValueError(f"output file is not a regular file: {component}")


def assert_private_output(output: Path) -> Path:
    """Reject symlinks and repository destinations outside the private subtree."""
    output = Path(output).absolute()
    _check_path(output, directory=True)
    output = output.resolve()
    if output.is_relative_to(ROOT) and not output.is_relative_to(ROOT / '.premium-infographics'):
        raise ValueError('in-repository outputs must remain inside .premium-infographics/')
    return output


def _json_bytes(value: dict) -> bytes:
    return (json.dumps(value, sort_keys=True, ensure_ascii=False,
                       separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8')


def _write(path: Path, content: bytes) -> None:
    with path.open('xb') as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())


def _validate_generation(path: Path, files: dict[str, bytes], manifest: bytes) -> None:
    """An existing hash is reusable only if its complete tree matches exactly."""
    _check_path(path, directory=True)
    expected = {'manifest.json': manifest, **files}
    expected_dirs = {name.split('/')[0] for name in files}
    found = set()
    for root, directories, names in os.walk(path, followlinks=False):
        for name in directories:
            child = Path(root) / name
            _check_path(child, directory=True)
            if child.relative_to(path).as_posix() not in expected_dirs:
                raise ValueError(f'foreign generation directory: {child}')
        for name in names:
            child = Path(root) / name
            relative = child.relative_to(path).as_posix()
            _check_path(child)
            if relative not in expected or child.read_bytes() != expected[relative]:
                raise ValueError(f'generation collision or modified file: {child}')
            found.add(relative)
    if found != set(expected):
        raise ValueError(f'incomplete generation: {path}')


def publish(output: Path, files: dict[str, bytes], metadata: dict) -> Path:
    """Publish a snapshot and return the active manifest path.

    Manifest schema 1: generation (SHA-256), metadata (caller-owned scope and
    provenance), and files mapping relative paths to sha256 and size. No scope
    inference, timestamps, merging with earlier generations, or garbage collection.
    The generation hashes canonical manifest inputs followed by all sorted bytes.
    """
    if not isinstance(files, dict) or not isinstance(metadata, dict):
        raise ValueError('files and metadata must be dictionaries')
    files = dict(files)
    for name, content in files.items():
        if not isinstance(name, str) or FILE_PATH.fullmatch(name) is None:
            raise ValueError(f'invalid artifact path: {name!r}')
        if not isinstance(content, bytes):
            raise ValueError(f'artifact content must be bytes: {name}')
    base = {'schema_version': 1, 'metadata': metadata,
            'files': {name: {'sha256': hashlib.sha256(content).hexdigest(), 'size': len(content)}
                      for name, content in sorted(files.items())}}
    canonical = _json_bytes(base)
    digest = hashlib.sha256(canonical)
    for name in sorted(files):
        digest.update(files[name])
    generation = digest.hexdigest()
    manifest = _json_bytes({**base, 'generation': generation})

    output = assert_private_output(output)
    generations = output / 'generations'
    active = output / 'active.json'
    _check_path(generations, directory=True)
    _check_path(active)
    output.mkdir(parents=True, exist_ok=True)
    generations.mkdir(exist_ok=True)
    target = generations / generation
    _check_path(target, directory=True)

    # Staging belongs exclusively to this call; never clean up another generation.
    staging = Path(tempfile.mkdtemp(prefix='.publish-', dir=output))
    try:
        staged_generation = staging / 'generation'
        staged_generation.mkdir()
        for name, content in sorted(files.items()):
            destination = staged_generation / name
            destination.parent.mkdir(exist_ok=True)
            _write(destination, content)
        _write(staged_generation / 'manifest.json', manifest)
        _write(staging / 'active.json', manifest)

        _check_path(generations, directory=True)
        # Exclusive creation avoids rename's ability to overwrite a foreign empty
        # directory. A failed move leaves an unreferenced, non-reusable generation.
        try:
            target.mkdir()
        except FileExistsError:
            _validate_generation(target, files, manifest)
        else:
            for child in staged_generation.iterdir():
                child.rename(target / child.name)
            _validate_generation(target, files, manifest)
        _check_path(active)
        os.replace(staging / 'active.json', active)
    finally:
        shutil.rmtree(staging)
    return active
