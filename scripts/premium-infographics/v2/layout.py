"""Measured text layout. A missing metric or overflow is a hard error."""
from dataclasses import dataclass


@dataclass(frozen=True)
class Box:
    x: float
    y: float
    w: float
    h: float

    def intersects(self, other):
        return (self.x < other.x + other.w and other.x < self.x + self.w
                and self.y < other.y + other.h and other.y < self.y + self.h)


@dataclass(frozen=True)
class Text:
    id: str
    value: str
    box: Box
    size: int = 26
    weight: int = 500
    color: str = '#182230'

    def candidates(self):
        words = self.value.split()
        return [' '.join(words[start:end]) for start in range(len(words))
                for end in range(start + 1, len(words) + 1)]


def wrap(text, measure):
    words = text.value.split()
    lines = []
    line = ''
    for word in words:
        if measure(word, text.size, text.weight) > text.box.w:
            raise ValueError(f'{text.id}: unbreakable token exceeds text box')
        candidate = f'{line} {word}'.strip()
        if measure(candidate, text.size, text.weight) <= text.box.w:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    if len(lines) * text.size * 1.25 > text.box.h:
        raise ValueError(f'{text.id}: text exceeds permitted line count/height')
    return lines


def validate_boxes(texts, width=1600, height=1200):
    ids = set()
    for index, text in enumerate(texts):
        b = text.box
        if text.id in ids:
            raise ValueError(f'{text.id}: duplicate text ID')
        ids.add(text.id)
        if b.w <= 0 or b.h <= 0 or min(b.x, b.y) < 0 or b.x+b.w > width or b.y+b.h > height:
            raise ValueError(f'{text.id}: text box outside canvas')
        for previous in texts[:index]:
            if b.intersects(previous.box):
                raise ValueError(f'{text.id}: text box intersects {previous.id}')
