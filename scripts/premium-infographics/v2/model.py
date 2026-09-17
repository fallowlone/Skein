"""Strict, dependency-free deployment infographic v2 authoring contract.

Both entry points return the original validated root, without localization or
mutation. ``canonical_path`` points to the repository's units.json collection;
omitting it uses that collection relative to this module. Sources are editorial
metadata, never renderer input. Validation performs no network requests.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlsplit

SCHEMA_VERSION = 2
LOCALES = ("en", "ru")
TEMPLATES = {"flow", "layers", "relationships", "comparison"}
ROLES = {"info", "success", "warning", "neutral"}
GROUPS = {"builder", "runtime", "general"}
EDGE_KINDS = {"sequence", "ownership", "selector", "traffic", "observation", "boundary"}
CANONICAL_PATH = Path(__file__).resolve().parents[3] / "site/src/content/units.json"
_ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*\Z")


class ValidationError(ValueError):
    """An authoring error, with its location in the input document."""


def _fail(path, message):
    raise ValidationError(f"{path}: {message}")


def _object(value, path, required, optional=()):
    if type(value) is not dict:
        _fail(path, "expected object")
    required, optional = set(required), set(optional)
    if any(type(key) is not str for key in value):
        _fail(path, "object keys must be strings")
    missing = required - value.keys()
    unknown = value.keys() - required - optional
    if missing or unknown:
        _fail(path, f"missing fields {sorted(missing)}; unknown fields {sorted(unknown)}")


def _string(value, path):
    if type(value) is not str or not value.strip():
        _fail(path, "expected nonempty string")
    if any(ord(char) < 32 or 127 <= ord(char) <= 159 for char in value):
        _fail(path, "control characters are not allowed")


def _localized(value, path):
    _object(value, path, LOCALES)
    for locale in LOCALES:
        _string(value[locale], f"{path}.{locale}")


def _list(value, path):
    if type(value) is not list:
        _fail(path, "expected array")


def _enum(value, path, choices):
    _string(value, path)
    if value not in choices:
        _fail(path, f"expected one of {sorted(choices)}")


def _id(value, path, seen):
    _string(value, path)
    if not _ID.fullmatch(value):
        _fail(path, "expected lowercase ASCII slug")
    if value in seen:
        _fail(path, f"duplicate id {value!r}")
    seen.add(value)


def _pairs(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            _fail("json", f"duplicate object key {key!r}")
        result[key] = value
    return result


def _constant(value):
    _fail("json", f"non-JSON number {value}")


def _read(path):
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"),
                          object_pairs_hook=_pairs, parse_constant=_constant)
    except json.JSONDecodeError as error:
        raise ValidationError(f"{path}: invalid JSON: {error}") from error


def _canonical(path):
    collection = _read(path)
    _list(collection, "canonical")
    slugs = set()
    for index, unit in enumerate(collection):
        if type(unit) is not dict:
            _fail(f"canonical[{index}]", "expected object")
        if unit.get("track") == "deployment":
            _id(unit.get("slug"), f"canonical[{index}].slug", slugs)
    if len(slugs) != 11:
        _fail("canonical", f"expected 11 deployment units, found {len(slugs)}")
    return slugs


def validate(data, canonical_path=None):
    """Validate the complete bilingual corpus, raising ValidationError on failure."""
    _object(data, "root", {"schema_version", "units"})
    if type(data["schema_version"]) is not int or data["schema_version"] != SCHEMA_VERSION:
        _fail("root.schema_version", "expected integer 2")
    _list(data["units"], "root.units")
    if len(data["units"]) != 11:
        _fail("root.units", "expected all 11 canonical deployment units")
    unit_ids = set()
    for index, unit in enumerate(data["units"]):
        p = f"root.units[{index}]"
        _object(unit, p, {"unit", "audience", "learning_objective", "template", "title",
                          "subtitle", "takeaway", "nodes", "edges", "criteria", "notes", "sources"})
        _id(unit["unit"], p + ".unit", unit_ids)
        _string(unit["audience"], p + ".audience")
        _enum(unit["template"], p + ".template", TEMPLATES)
        for key in ("learning_objective", "title", "subtitle", "takeaway", "notes"):
            _localized(unit[key], p + "." + key)
        for key in ("nodes", "edges", "criteria", "sources"):
            _list(unit[key], p + "." + key)
        template = unit["template"]
        nodes, edges = unit["nodes"], unit["edges"]
        lo, hi = {"flow": (3, 6), "layers": (3, 6), "relationships": (4, 4),
                  "comparison": (2, 4)}[template]
        if not lo <= len(nodes) <= hi:
            _fail(p + ".nodes", f"{template} requires {lo}..{hi} nodes")
        ids, node_ids, state_presence = set(), [], []
        for ni, node in enumerate(nodes):
            np = f"{p}.nodes[{ni}]"
            _object(node, np, {"id", "label", "detail", "role", "group"}, {"states", "downtime"})
            _id(node["id"], np + ".id", ids)
            node_ids.append(node["id"])
            _localized(node["label"], np + ".label")
            _localized(node["detail"], np + ".detail")
            _enum(node["role"], np + ".role", ROLES)
            _enum(node["group"], np + ".group", GROUPS)
            state_presence.append("states" in node)
            if "states" in node:
                if template != "comparison" or unit["unit"] != "04-rollout-strategies":
                    _fail(np + ".states", "traffic states are only for rollout comparisons")
                _list(node["states"], np + ".states")
                if len(node["states"]) != 3 or any(type(n) is not int or not 0 <= n <= 100 for n in node["states"]):
                    _fail(np + ".states", "expected three integer percentages in 0..100")
            if "downtime" in node:
                if "states" not in node:
                    _fail(np + ".downtime", "requires traffic states")
                _list(node["downtime"], np + ".downtime")
                if len(node["downtime"]) != 3 or any(type(n) is not bool for n in node["downtime"]):
                    _fail(np + ".downtime", "expected three boolean flags")
                if any(down and percent != 0 for down, percent in zip(node["downtime"], node["states"])):
                    _fail(np + ".downtime", "no-service interval must have zero new traffic")
        if any(state_presence) and not all(state_presence):
            _fail(p + ".nodes", "traffic states must be present on every comparison node or none")
        actual = set()
        for ei, edge in enumerate(edges):
            ep = f"{p}.edges[{ei}]"
            _object(edge, ep, {"id", "from", "to", "kind", "label"})
            _id(edge["id"], ep + ".id", ids)
            _enum(edge["kind"], ep + ".kind", EDGE_KINDS)
            _localized(edge["label"], ep + ".label")
            for endpoint in ("from", "to"):
                _string(edge[endpoint], ep + "." + endpoint)
                if edge[endpoint] not in node_ids:
                    _fail(ep + "." + endpoint, "unknown node endpoint")
            pair = (node_ids.index(edge["from"]), node_ids.index(edge["to"]))
            if pair in actual:
                _fail(ep, "duplicate edge endpoints")
            actual.add(pair)
            if template == "comparison":
                _fail(ep, "comparison permits no edges")
            if template == "relationships":
                if pair not in {(0, 1), (1, 2), (3, 2)}:
                    _fail(ep, "unsupported relationship topology")
            else:
                adjacent = pair[1] == pair[0] + 1
                feedback = template == "flow" and pair == (len(nodes)-1, 0) and edge["kind"] == "observation"
                if not feedback and not (adjacent and edge["kind"] == "sequence"):
                    _fail(ep, "requires adjacent sequence edges (flow also permits last-to-first observation)")
        if template in {"flow", "layers"}:
            required = {(i, i+1) for i in range(len(nodes)-1)}
            if not required <= actual:
                _fail(p + ".edges", "missing adjacent sequence edge")
        criteria = unit["criteria"]
        if template == "comparison":
            if not 2 <= len(criteria) <= 3:
                _fail(p + ".criteria", "comparison requires 2..3 criteria")
        elif criteria:
            _fail(p + ".criteria", "criteria only belong to comparison")
        for ci, criterion in enumerate(criteria):
            cp = f"{p}.criteria[{ci}]"
            _object(criterion, cp, {"id", "label", "cells"})
            _id(criterion["id"], cp + ".id", ids)
            _localized(criterion["label"], cp + ".label")
            _object(criterion["cells"], cp + ".cells", node_ids)
            for node_id in node_ids:
                _localized(criterion["cells"][node_id], cp + ".cells." + node_id)
        if not unit["sources"]:
            _fail(p + ".sources", "at least one official documentation URL is required")
        sources = set()
        for si, source in enumerate(unit["sources"]):
            sp = f"{p}.sources[{si}]"
            _string(source, sp)
            try:
                url = urlsplit(source)
                valid = (url.scheme == "https" and url.hostname and not url.username
                         and not url.password and url.port in (None, 443)
                         and not any(c.isspace() for c in source) and "\\" not in source)
            except ValueError:
                valid = False
            if not valid:
                _fail(sp, "expected absolute HTTPS documentation URL without credentials")
            if source in sources:
                _fail(sp, "duplicate source URL")
            sources.add(source)
    expected = _canonical(CANONICAL_PATH if canonical_path is None else canonical_path)
    if unit_ids != expected:
        _fail("root.units", f"canonical mismatch; missing {sorted(expected-unit_ids)}; extra {sorted(unit_ids-expected)}")
    return data


def load(path, canonical_path=None):
    """Read UTF-8 JSON and validate the complete root against canonical units."""
    return validate(_read(path), canonical_path)
