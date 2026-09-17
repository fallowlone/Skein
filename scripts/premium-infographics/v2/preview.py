"""Synthetic public preview: deliberately accepts no course specification."""
from layout import Box, Text
from svg import rect, path


def compose(locale, template):
    if locale not in ('en', 'ru') or template not in ('flow', 'comparison', 'layers', 'relationships'):
        raise ValueError('unsupported public preview parameters')
    shapes = []
    if template == 'comparison':
        for x in (100, 320, 540):
            shapes.append(rect(x, 180, 160, 250, '#edf3ff'))
            for y in (225, 285, 345):
                shapes.append(rect(x+25,y,110,12,'#ced5df','#ced5df',3))
    elif template == 'layers':
        for y in (180,255,330,405):
            shapes.append(rect(150,y,500,50,'#edf3ff'))
    elif template == 'flow':
        for i in range(3):
            x=100+i*220
            shapes.append(rect(x,255,160,100,'#edf3ff'))
            if i<2:
                shapes.append(path([(x+160,305),(x+210,305)],arrow=True))
    else:
        for x,y in ((140,180),(140,360),(500,270)):
            shapes.append(rect(x,y,160,90,'#edf3ff'))
        shapes.append(path([(220,270),(220,360)],arrow=True))
        shapes.append(path([(500,315),(410,315),(410,405),(300,405)],dash='8 5',arrow=True))
    texts=[Text('preview-brand','SKEIN COACH',Box(70,50,660,42),30,700),
           Text('preview-label','PREVIEW' if locale=='en' else 'ПРЕВЬЮ',Box(70,505,660,55),36,700)]
    return shapes,texts
