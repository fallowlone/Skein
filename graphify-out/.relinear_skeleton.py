import json, re
from pathlib import Path

classify = json.load(open('graphify-out/.relinear_classify.json'))
en = sorted(f for f in classify['authored'] if '/en/' in f)

def fm_block(txt):
    m = re.match(r'^---\n(.*?)\n---\n', txt, re.S)
    return m.group(1) if m else ''

def fm_get(fm, key):
    m = re.search(r'^' + key + r':\s*(.+)$', fm, re.M)
    return m.group(1).strip() if m else None

def strip_tags(s):
    s = re.sub(r'<[^>]+>', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

out = []
for f in en:
    txt = Path(f).read_text(encoding='utf-8')
    fm = fm_block(txt)
    body = txt[len(fm)+8:] if fm else txt
    # crux
    cm = re.search(r'<Crux>(.*?)</Crux>', body, re.S)
    crux = strip_tags(cm.group(1)) if cm else ''
    # key takeaway
    km = re.search(r'<KeyTakeaway>(.*?)</KeyTakeaway>', body, re.S)
    keytake = strip_tags(km.group(1)) if km else ''
    # misconception titles + bodies
    misc = []
    for mm in re.finditer(r'<Misconception[^>]*title="([^"]*)"[^>]*>(.*?)</Misconception>', body, re.S):
        misc.append(mm.group(1) + ' :: ' + strip_tags(mm.group(2))[:300])
    # bold lead-ins = concept inventory
    leads = []
    for bm in re.finditer(r'<strong>(.*?)</strong>', body, re.S):
        t = strip_tags(bm.group(1)).rstrip('.: ')
        if 3 < len(t) < 90:
            leads.append(t)
    # h3 headers
    heads = re.findall(r'^###\s+(.+)$', body, re.M)
    out.append({
        'file': f,
        'title': (fm_get(fm, 'title') or '').strip('"\''),
        'summary': (fm_get(fm, 'summary') or '').strip('"\''),
        'pillar': (fm_get(fm, 'pillar') or '').strip('"\''),
        'slug': (fm_get(fm, 'slug') or '').strip('"\''),
        'prereqs': fm_get(fm, 'prereqs'),
        'spiral': fm_get(fm, 'spiral'),
        'crux': crux,
        'keytakeaway': keytake,
        'misconceptions': misc,
        'concept_leadins': leads,
        'headers': heads,
    })

Path('graphify-out/.relinear_skeleton.json').write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8')
tot = sum(len(json.dumps(o)) for o in out)
print('skeletons:', len(out), 'chars:', tot, '~tokens:', tot // 4)
