import json, re, glob
from pathlib import Path

# ---- 1. mirror EN doc->concept references onto RU twins ----
mirror_edges = []
seen_concept_ids = set()
for cf in sorted(glob.glob('graphify-out/.relinear_chunk_*.json')):
    if cf.endswith('.relinear_chunk_ru_prereq.json'):
        continue  # never mirror our own prior output
    d = json.loads(Path(cf).read_text(encoding='utf-8'))
    for n in d['nodes']:
        seen_concept_ids.add(n['id'])
    for e in d['edges']:
        if (e['relation'] == 'references' and e['source'].startswith('doc_en_')
                and e['target'].startswith('concept_')):
            ru = 'doc_ru_' + e['source'][len('doc_en_'):]
            mirror_edges.append({
                'source': ru, 'target': e['target'], 'relation': 'references',
                'confidence': 'EXTRACTED', 'confidence_score': 1.0,
                'source_file': e['source_file'], 'weight': 1.0,
            })

# ---- 2. prereq doc->doc edges (en and ru) ----
docmeta = json.loads(Path('graphify-out/.relinear_docmeta.json').read_text(encoding='utf-8'))
doc_ids = set(docmeta.keys())

def norm(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')

# lesson doc ids carry a unit segment, so a bare lesson-slug prereq cannot be
# rebuilt by string concat. Map (lang, norm(lesson_slug)) -> doc_id from docmeta.
lesson_slug_map = {}
for did, m in docmeta.items():
    tw = m.get('twkey')
    if tw and tw[0] == 'lessons':
        lesson_slug_map[(m['lang'], norm(tw[2]))] = did

def fm_block(txt):
    m = re.match(r'^---\n(.*?)\n---\n', txt, re.S)
    return m.group(1) if m else ''

classify = json.loads(Path('graphify-out/.relinear_classify.json').read_text(encoding='utf-8'))
prereq_edges = []
for f in classify['authored']:
    parts = Path(f).parts
    txt = Path(f).read_text(encoding='utf-8')
    fm = fm_block(txt)
    m = re.search(r'^prereqs:\s*(\[.*?\])', fm, re.M | re.S)
    if not m:
        continue
    try:
        prereqs = json.loads(m.group(1).replace("'", '"'))
    except Exception:
        prereqs = re.findall(r'"([^"]+)"', m.group(1))
    is_book = 'book' in parts
    if is_book:
        i = parts.index('book'); lang = parts[i+1]; pillar = parts[i+2]; piece = parts[i+3]
        src_id = 'doc_%s_%s_%s' % (lang, norm(pillar), norm(piece))
    else:
        i = parts.index('lessons'); lang = parts[i+1]; track = parts[i+2]
        unit = parts[i+3]; lesson = parts[i+4]
        src_id = 'doc_%s_%s_%s_%s' % (lang, norm(track), norm(unit), norm(lesson))
    for pr in prereqs:
        pr = pr.strip()
        if not pr:
            continue
        if is_book:
            if '/' in pr:
                pp, piecedir = pr.split('/', 1)
                tgt_id = 'doc_%s_%s_%s' % (lang, norm(pp), norm(piecedir))
            else:
                tgt_id = 'doc_%s_%s_%s' % (lang, norm(pillar), norm(pr))
        else:
            # lesson prereq: a bare or unit-qualified lesson slug -> resolve via map
            slug = pr.split('/')[-1]
            tgt_id = lesson_slug_map.get((lang, norm(slug)))
        if tgt_id and tgt_id in doc_ids and src_id in doc_ids:
            prereq_edges.append({
                'source': src_id, 'target': tgt_id, 'relation': 'references',
                'confidence': 'EXTRACTED', 'confidence_score': 1.0,
                'source_file': f, 'weight': 1.0,
            })

out = {'nodes': [], 'edges': mirror_edges + prereq_edges, 'hyperedges': [],
       'input_tokens': 0, 'output_tokens': 0}
Path('graphify-out/.relinear_chunk_ru_prereq.json').write_text(
    json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8')
print('ru-mirror edges: %d, prereq edges: %d' % (len(mirror_edges), len(prereq_edges)))
