import json, re
from pathlib import Path

d = json.load(open('graphify-out/.graphify_detect.json'))
docs = sorted(d['files']['document'])

def norm(s):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')

PILLAR_LABEL = {
    'ai-llm': 'AI & LLM Integration', 'apis': 'API Design', 'backend': 'Backend Architecture',
    'browser': 'Browser Internals', 'caching': 'Caching', 'data-engineering': 'Data Engineering',
    'databases': 'Databases', 'deployment': 'Deployment & Infra', 'distributed': 'Distributed Systems',
    'engineering-practice': 'Engineering Practice', 'frontend': 'Frontend Architecture',
    'networking': 'Networking', 'observability': 'Observability', 'performance': 'Performance',
    'queues': 'Queues & Messaging', 'security': 'Security',
}

def fm_field(txt, key):
    m = re.search(r'^' + key + r':\s*["\']?(.+?)["\']?\s*$', txt, re.M)
    return m.group(1).strip() if m else None

nodes = {}
edges = []

# pillar nodes
for slug, label in PILLAR_LABEL.items():
    nodes['pillar_' + norm(slug)] = {
        'id': 'pillar_' + norm(slug), 'label': label + ' (pillar)',
        'file_type': 'concept', 'source_file': 'site/src/content/pillars/' + slug + '.json',
        'source_location': None, 'source_url': None, 'captured_at': None,
        'author': None, 'contributor': None,
    }
nodes['track_math'] = {
    'id': 'track_math', 'label': 'Mathematics (foundations track)',
    'file_type': 'concept', 'source_file': 'site/src/content/tracks.json',
    'source_location': None, 'source_url': None, 'captured_at': None,
    'author': None, 'contributor': None,
}

# doc nodes + pillar edges
twins = {}  # key -> {lang: doc_id}
docmeta = {}
for f in docs:
    parts = Path(f).parts
    txt = Path(f).read_text(encoding='utf-8')
    title = fm_field(txt, 'title') or Path(f).parent.name
    status = (fm_field(txt, 'status') or 'stub').strip('"\'')
    if 'book' in parts:
        i = parts.index('book'); lang = parts[i+1]; pillar = parts[i+2]; piece = parts[i+3]
        did = 'doc_%s_%s_%s' % (lang, norm(pillar), norm(piece))
        pillar_id = 'pillar_' + norm(pillar)
        twkey = ('book', pillar, piece)
    else:
        i = parts.index('lessons'); lang = parts[i+1]; track = parts[i+2]
        unit = parts[i+3]; lesson = parts[i+4]
        did = 'doc_%s_%s_%s_%s' % (lang, norm(track), norm(unit), norm(lesson))
        pillar_id = 'track_math'
        twkey = ('lessons', unit, lesson)
    nodes[did] = {
        'id': did, 'label': '%s [%s]' % (title, lang.upper()),
        'file_type': 'document', 'source_file': f, 'source_location': None,
        'source_url': None, 'captured_at': None, 'author': None, 'contributor': None,
    }
    edges.append({'source': did, 'target': pillar_id, 'relation': 'conceptually_related_to',
                  'confidence': 'EXTRACTED', 'confidence_score': 1.0, 'source_file': f, 'weight': 1.0})
    twins.setdefault(twkey, {})[lang] = did
    docmeta[did] = {'status': status, 'lang': lang, 'twkey': twkey, 'file': f}

# en<->ru twin edges
for twkey, langs in twins.items():
    if 'en' in langs and 'ru' in langs:
        edges.append({'source': langs['en'], 'target': langs['ru'], 'relation': 'semantically_similar_to',
                       'confidence': 'EXTRACTED', 'confidence_score': 1.0,
                       'source_file': docmeta[langs['en']]['file'], 'weight': 1.0})

out = {'nodes': list(nodes.values()), 'edges': edges, 'hyperedges': [],
       'input_tokens': 0, 'output_tokens': 0}
Path('graphify-out/.relinear_scaffold.json').write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8')
Path('graphify-out/.relinear_docmeta.json').write_text(json.dumps(docmeta, indent=1, ensure_ascii=False), encoding='utf-8')
auth = sum(1 for m in docmeta.values() if m['status'] in ('ready', 'draft'))
print('scaffold: %d nodes, %d edges' % (len(out['nodes']), len(edges)))
print('docs: %d total, %d authored, %d stub' % (len(docmeta), auth, len(docmeta)-auth))
