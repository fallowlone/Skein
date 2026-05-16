"""Shared emitter for linear concept chunks.
Each chapter script imports emit_chunk and passes a spec.
"""
import json, re
from pathlib import Path

BOOK = 'site/src/content/book/en'
LESS = 'site/src/content/lessons/en'


def norm(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')


def emit_chunk(chapter, pillar, concepts, piece_concepts, relations,
               piece_file=None, kind='book'):
    """
    concepts: {slug: label}
    piece_concepts: {piece_dir: [concept_slug, ...]}  first piece dir owns the concept's source_file
    relations: [(slug_a, slug_b, relation, score), ...]
    """
    nodes = {}
    edges = []

    def doc_id(piece_dir):
        if kind == 'book':
            return 'doc_en_%s_%s' % (norm(pillar), norm(piece_dir))
        return 'doc_en_%s_%s' % (norm(pillar), norm(piece_dir))

    def piece_path(piece_dir):
        if kind == 'book':
            return '%s/%s/%s/index.mdx' % (BOOK, pillar, piece_dir)
        return piece_dir  # full path passed for lessons

    # owner of each concept = first piece that lists it
    owner = {}
    for pd, clist in piece_concepts.items():
        for c in clist:
            owner.setdefault(c, pd)

    for slug, label in concepts.items():
        pd = owner.get(slug)
        src = piece_path(pd) if pd else '%s' % BOOK
        nodes['concept_' + slug] = {
            'id': 'concept_' + slug, 'label': label, 'file_type': 'concept',
            'source_file': src, 'source_location': None, 'source_url': None,
            'captured_at': None, 'author': None, 'contributor': None,
        }

    # doc -> concept references
    for pd, clist in piece_concepts.items():
        did = doc_id(pd)
        pf = piece_path(pd)
        for c in clist:
            if c not in concepts:
                raise SystemExit('unknown concept %s in piece %s' % (c, pd))
            edges.append({'source': did, 'target': 'concept_' + c,
                          'relation': 'references', 'confidence': 'EXTRACTED',
                          'confidence_score': 1.0, 'source_file': pf, 'weight': 1.0})

    # concept -> concept
    for a, b, rel, score in relations:
        for x in (a, b):
            if x not in concepts:
                raise SystemExit('unknown concept in relation: %s' % x)
        edges.append({'source': 'concept_' + a, 'target': 'concept_' + b,
                       'relation': rel, 'confidence': 'INFERRED',
                       'confidence_score': score,
                       'source_file': '%s/%s' % (BOOK, pillar), 'weight': 1.0})

    out = {'nodes': list(nodes.values()), 'edges': edges, 'hyperedges': [],
           'input_tokens': 0, 'output_tokens': 0}
    p = 'graphify-out/.relinear_chunk_%s.json' % chapter
    Path(p).write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8')
    print('%s: %d concepts, %d edges -> %s' % (chapter, len(nodes), len(edges), p))
