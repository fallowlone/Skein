"""Four bounded compositions, not an arbitrary graph layout engine."""
from layout import Box, Text, validate_boxes
from svg import COLORS, FILLS, path, rect

VERSION = '2.0-experimental.1'
RELATIONS = {
    'sequence': ('Sequence', 'Порядок', ''),
    'ownership': ('Ownership', 'Владение', ''),
    'selector': ('Label selector', 'Выбор по labels', '8 5'),
    'traffic': ('Traffic', 'Трафик', ''),
    'observation': ('Feedback', 'Обратная связь', '3 6'),
    'boundary': ('Boundary', 'Граница', '12 5'),
}


def compose(spec, locale):
    shapes, texts = [], []

    def text(id, value, x, y, w, h, size=26, weight=500, color='#182230'):
        value = value[locale] if isinstance(value, dict) else value
        texts.append(Text(f'{spec["unit"]}-{locale}-{id}', value, Box(x, y, w, h), size, weight, color))

    text('brand', 'SKEIN / DEPLOYMENT', 80, 48, 1100, 32, 24, 700)
    text('title', spec['title'], 80, 105, 1440, 130, 48, 700)
    text('subtitle', spec['subtitle'], 80, 242, 1440, 40, 28)
    shapes.append(rect(80, 1020, 1440, 125, '#edf3ff', '#edf3ff'))
    text('takeaway', spec['takeaway'], 108, 1038, 1384, 90, 30, 600)
    text('metadata', 'Skein Premium / v2 / ' + locale.upper(), 80, 1160, 1440, 30, 22)
    nodes, edges = spec['nodes'], spec['edges']
    by_id = {node['id']: i for i, node in enumerate(nodes)}

    def node(index, x, y, w=500, h=130):
        item = nodes[index]
        shapes.append(rect(x, y, w, h, FILLS[item['role']], COLORS[item['role']]))
        text(item['id'] + '-label', item['label'], x+24, y+14, w-48, 45, 30, 700)
        text(item['id'] + '-detail', item['detail'], x+24, y+62, w-48, h-70, 24)

    if spec['template'] == 'comparison':
        column = 1200 / len(nodes)
        for index, item in enumerate(nodes):
            x = 320 + index * column
            shapes.append(rect(x, 315, column-12, 295, FILLS[item['role']], '#ced5df'))
            text(item['id']+'-label', item['label'], x+16, 333, column-44, 82, 30, 700)
            text(item['id']+'-detail', item['detail'], x+16, 430, column-44, 93, 24)
            if 'states' in item:
                width = (column-62)/3
                for step, percent in enumerate(item['states']):
                    sx = x+16+step*(width+9)
                    down = item.get('downtime', [False]*3)[step]
                    color = COLORS['warning'] if down else '#ced5df'
                    shapes.append(rect(sx, 536, width, 12, color, color, 2))
                    if percent:
                        shapes.append(rect(sx, 536, width*percent/100, 12, '#23765b', '#23765b', 2))
                    label = ('Down' if locale == 'en' else 'Стоп') if down else f'{percent}%'
                    text(f'{item["id"]}-state-{step}', label, sx, 558, width, 32, 22)
        if any('states' in item for item in nodes):
            text('state-key', 'New traffic: start / shift / end' if locale == 'en' else 'Новый трафик: до / переход / после', 80, 327, 205, 150, 24)
        for index, criterion in enumerate(spec['criteria']):
            y = 634 + index*118
            shapes.append(path([(80, y-8), (1520, y-8)], '#ced5df'))
            text(criterion['id']+'-label', criterion['label'], 80, y+8, 210, 99, 26, 600)
            for ni, item in enumerate(nodes):
                text(criterion['id']+'-'+item['id'], criterion['cells'][item['id']], 336+ni*column, y+8, column-44, 99, 24)

    elif spec['template'] == 'layers':
        groups = {'builder': {'en': 'BUILD STAGE', 'ru': 'ЭТАП СБОРКИ'},
                  'runtime': {'en': 'RUNTIME STAGE', 'ru': 'ЭТАП ЗАПУСКА'},
                  'general': {'en': 'LAYER', 'ru': 'СЛОЙ'}}
        for index, item in enumerate(nodes):
            y = 310+index*118
            shapes.append(rect(140, y, 1060, 82, FILLS[item['role']], COLORS[item['role']]))
            text(item['id']+'-label', item['label'], 164, y+10, 360, 68, 27, 700)
            text(item['id']+'-detail', item['detail'], 555, y+10, 620, 65, 24)
            text(item['id']+'-group', groups[item['group']], 1240, y+10, 260, 65, 24, 600)
        for edge in edges:
            index = by_id[edge['from']]
            y = 351+index*118
            shapes.append(path([(140,y), (105,y), (105,y+118), (140,y+118)], COLORS['warning'] if nodes[index]['role']=='warning' else COLORS['neutral'], arrow=True))
            text(edge['id'], edge['label'], 555, y+43, 620, 26, 20)

    elif spec['template'] == 'flow':
        for index, item in enumerate(nodes):
            y = 305+index*108
            shapes.append(rect(140,y,620,82,FILLS[item['role']],COLORS[item['role']]))
            text(item['id']+'-label',item['label'],164,y+10,245,68,27,700)
            text(item['id']+'-detail',item['detail'],431,y+10,305,68,24)
        for edge in edges:
            source, target = by_id[edge['from']], by_id[edge['to']]
            sy, ty = 346+source*108, 346+target*108
            if edge['kind'] == 'observation':
                shapes.append(path([(140,sy),(95,sy),(95,ty),(140,ty)], dash='3 6', arrow=True))
                text(edge['id'],edge['label'],840,927,660,62,24,600)
            else:
                shapes.append(path([(760,sy),(806,sy),(806,ty),(760,ty)], arrow=True))
                text(edge['id'],edge['label'],840,sy+24,660,62,24)

    elif spec['template'] == 'relationships':
        positions = [(80,315),(80,535),(80,770),(1000,535)]
        for index, (x,y) in enumerate(positions):
            node(index,x,y)
        for edge in edges:
            source, target = by_id[edge['from']], by_id[edge['to']]
            dash = RELATIONS[edge['kind']][2]
            if (source,target)==(0,1):
                points, box = [(330,445),(330,535)], (375,460,575,64)
            elif (source,target)==(1,2):
                points, box = [(330,665),(330,770)], (375,685,575,64)
            elif (source,target)==(3,2):
                points, box = [(1250,665),(1250,835),(580,835)], (800,852,700,62)
            else:
                raise ValueError(f'{spec["unit"]}: unsupported relationship topology')
            shapes.append(path(points, COLORS['info'] if edge['kind']=='traffic' else COLORS['neutral'],dash,True))
            text(edge['id'],edge['label'],*box,24)
        kinds = sorted({edge['kind'] for edge in edges})
        # Each relation has an explicit semantic key as well as a stroke treatment.
        for index, kind in enumerate(kinds):
            x = 80+index*480
            shapes.append(path([(x,962),(x+48,962)],dash=RELATIONS[kind][2],arrow=True))
            text('key-'+kind,RELATIONS[kind][0 if locale=='en' else 1],x+64,944,400,38,24)
    else:
        raise ValueError('unsupported template')
    validate_boxes(texts)
    return shapes, texts
