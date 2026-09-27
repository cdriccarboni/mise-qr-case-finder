#!/usr/bin/env python3
"""Studies for the MISE ! wordmark. Does not replace the logo in the app.

Letters are outlined from Fredoka (SIL OFL), the same face as the live wordmark.
Each study must still read in one ink, and at a small size.
"""
import math
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

import importlib.util

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'design'
FONT = ROOT / 'src' / 'fonts' / 'Fredoka.ttf'

PAPER = '#f4f1ea'
TYPE = '#161513'
INK = '#0B3D91'
MUTED = '#5c5852'


def load_bw():
    path = ROOT / 'scripts' / 'build-wordmark.py'
    spec = importlib.util.spec_from_file_location('build_wordmark', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BW = load_bw()


def font_path(contour, ox):
    """SVG path in font space (y up). A later scale(1,-1) turns it upright."""
    def mp(p):
        return (ox + p[0], p[1])

    parts = []
    for op, pts in contour:
        if op == 'moveTo':
            x, y = mp(pts[0])
            parts.append(f'M{x:.2f} {y:.2f}')
        elif op == 'lineTo':
            x, y = mp(pts[0])
            parts.append(f'L{x:.2f} {y:.2f}')
        elif op == 'qCurveTo':
            offs = list(pts[:-1])
            end = pts[-1]
            seq = []
            for i, control in enumerate(offs):
                seq.append(control)
                if i < len(offs) - 1:
                    nxt = offs[i + 1]
                    seq.append(((control[0] + nxt[0]) / 2, (control[1] + nxt[1]) / 2))
            seq.append(end)
            i = 0
            while i + 1 < len(seq):
                c, on = mp(seq[i]), mp(seq[i + 1])
                parts.append(f'Q{c[0]:.2f} {c[1]:.2f} {on[0]:.2f} {on[1]:.2f}')
                i += 2
        elif op == 'curveTo':
            mapped = [mp(p) for p in pts]
            parts.append('C' + ' '.join(f'{x:.2f} {y:.2f}' for x, y in mapped))
        elif op == 'closePath':
            parts.append('Z')
    return ''.join(parts)


def circle_points(cx, cy, r, n=40):
    return [
        (cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n))
        for i in range(n)
    ]


def polygon_path(points):
    head = points[0]
    body = ''.join(f'L{x:.2f} {y:.2f}' for x, y in points[1:])
    return f'M{head[0]:.2f} {head[1]:.2f}{body}Z'


def regular_polygon(cx, cy, radius, sides, rotation=-math.pi / 2):
    return [
        (
            cx + radius * math.cos(rotation + 2 * math.pi * i / sides),
            cy + radius * math.sin(rotation + 2 * math.pi * i / sides),
        )
        for i in range(sides)
    ]


def capsule(cx, cy, length, thickness, horizontal=True, n=10):
    """Stadium shape. length is the long side, thickness the short side."""
    radius = thickness / 2
    if horizontal:
        straight = max(0, length / 2 - radius)
        left, right = cx - straight, cx + straight
        pts = []
        for i in range(n + 1):
            a = math.pi / 2 + math.pi * i / n
            pts.append((left + radius * math.cos(a), cy + radius * math.sin(a)))
        for i in range(n + 1):
            a = -math.pi / 2 + math.pi * i / n
            pts.append((right + radius * math.cos(a), cy + radius * math.sin(a)))
        return pts
    straight = max(0, length / 2 - radius)
    bottom, top = cy - straight, cy + straight
    pts = []
    for i in range(n + 1):
        a = math.pi + math.pi * i / n
        pts.append((cx + radius * math.cos(a), bottom + radius * math.sin(a)))
    for i in range(n + 1):
        a = 0 + math.pi * i / n
        pts.append((cx + radius * math.cos(a), top + radius * math.sin(a)))
    return pts


def wave_ribbon(cx, cy, width=228, amplitude=42, thick=72, humps=2.5, steps=56):
    """Bold wave, about the weight of the i dot, so it survives a small print."""
    left = cx - width / 2
    top, bottom = [], []
    for i in range(steps + 1):
        t = i / steps
        x = left + width * t
        y = cy + amplitude * math.sin(t * humps * 2 * math.pi)
        slope = amplitude * humps * 2 * math.pi / width * math.cos(t * humps * 2 * math.pi)
        nx, ny = -slope, 1
        norm = math.hypot(nx, ny) or 1
        ox, oy = nx / norm * thick / 2, ny / norm * thick / 2
        top.append((x + ox, y + oy))
        bottom.append((x - ox, y - oy))
    return top + bottom[::-1]


class Composer:
    def __init__(self):
        font = instantiateVariableFont(TTFont(FONT), {'wght': 680, 'wdth': 100}, inplace=False)
        self.glyphs = font.getGlyphSet()
        self.cmap = font.getBestCmap()
        self.parts = []
        self.points = []

    def glyph(self, ch):
        return self.glyphs[self.cmap[ord(ch)]]

    def add_path(self, d, fill):
        self.parts.append(f'<path fill="{fill}" d="{d}"/>')

    def add_poly(self, points, fill):
        self.points.extend(points)
        self.add_path(polygon_path(points), fill)

    def add_contours(self, contours, ox, fill):
        d = ''.join(font_path(c, ox) for c in contours)
        self.add_path(d, fill)
        for contour in contours:
            x0, y0, x1, y1 = BW.contour_box(contour)
            self.points.extend([(ox + x0, y0), (ox + x1, y1)])

    def split_dot(self, ch):
        found = BW.contours_of(self.glyph(ch))
        if ch not in ('i', '!'):
            return found, None
        boxes = [(BW.contour_box(c), c) for c in found]
        boxes.sort(key=lambda item: (item[0][2] - item[0][0]) * (item[0][3] - item[0][1]))
        box, dot = boxes[0]
        body = [c for c in found if c is not dot]
        x0, y0, x1, y1 = box
        info = {
            'cx': (x0 + x1) / 2,
            'cy': (y0 + y1) / 2,
            'r': min(x1 - x0, y1 - y0) / 2,
            'box': box,
        }
        return body, info

    def place_letters(self, sequence, x, accent, dot='circle'):
        """Draw a line. dot is circle, token, wave, or mallet (the ! dot)."""
        cursor = x
        space = self.glyph(' ').width * 0.42
        placed = {}
        for ch in sequence:
            if ch == ' ':
                cursor += space
                continue
            body, info = self.split_dot(ch)
            placed[ch] = (cursor, info)
            fill = TYPE
            self.add_contours(body, cursor, fill)
            if info and not (ch == '!' and dot == 'mallet') and not (ch == 'i' and dot in ('token', 'wave')):
                cx, cy, r = cursor + info['cx'], info['cy'], info['r']
                self.add_poly(circle_points(cx, cy, r), accent)
            cursor += self.glyph(ch).width
        if dot == 'token' and 'i' in placed:
            cursor_i, info = placed['i']
            cx, cy = cursor_i + info['cx'], info['cy']
            # Point up on the page (the group flips y).
            self.add_poly(regular_polygon(cx, cy, info['r'] * 1.05, 5, rotation=math.pi / 2), accent)
        if dot == 'wave' and 'i' in placed:
            cursor_i, info = placed['i']
            cx, cy = cursor_i + info['cx'], info['cy']
            self.add_poly(wave_ribbon(cx, cy, width=176, amplitude=68, thick=46, humps=2), accent)
        if dot == 'mallet' and '!' in placed:
            cursor_b, info = placed['!']
            cx, cy = cursor_b + info['cx'], info['cy']
            # Wide short head, close to the stem: a beater, still the dot of the !.
            self.add_poly(capsule(cx, cy + 28, 196, 96, horizontal=True), accent)
        return cursor, placed

    def svg(self, label, pad=56):
        xs = [p[0] for p in self.points]
        ys = [p[1] for p in self.points]
        minx, maxx = min(xs), max(xs)
        miny, maxy = min(ys), max(ys)
        width = maxx - minx + pad * 2
        height = maxy - miny + pad * 2
        tx = pad - minx
        ty = pad + maxy
        body = ''.join(self.parts)
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.2f} {height:.2f}" '
            f'role="img" aria-label="{label}">'
            f'<g transform="translate({tx:.2f} {ty:.2f}) scale(1 -1)">{body}</g>'
            f'</svg>'
        )


def build(sequence, dot, label, accent=INK):
    comp = Composer()
    comp.place_letters(sequence, 0, accent, dot=dot)
    return comp.svg(label)


def build_tampon(label, accent=INK):
    comp = Composer()
    # Ghost pass first, same ink as the letters, shifted like a bad screen pull.
    ghost = Composer()
    ghost.place_letters('mise !', 0, TYPE, dot='circle')
    comp.parts.append(f'<g transform="translate(40 -26)">{"".join(ghost.parts)}</g>')
    comp.points.extend((x + 40, y - 26) for x, y in ghost.points)
    comp.place_letters('mise !', 0, accent, dot='circle')
    return comp.svg(label)


def build_pile_real(label, accent=INK):
    top = Composer()
    top.place_letters('mi', 0, accent, dot='circle')
    bot = Composer()
    gap = bot.glyph(' ').width * 0.28
    bot.place_letters('se', 0, accent, dot='circle')
    bang_x = bot.glyph('s').width + bot.glyph('e').width + gap
    bot.place_letters('!', bang_x, accent, dot='circle')
    top_w = max(p[0] for p in top.points) - min(p[0] for p in top.points)
    bot_w = max(p[0] for p in bot.points) - min(p[0] for p in bot.points)
    block = max(top_w, bot_w)
    top_shift = (block - top_w) / 2 - min(p[0] for p in top.points)
    bot_shift = (block - bot_w) / 2 - min(p[0] for p in bot.points)
    rise = 900
    comp = Composer()
    comp.parts.append(f'<g transform="translate({top_shift:.2f} {rise})">{"".join(top.parts)}</g>')
    comp.parts.append(f'<g transform="translate({bot_shift:.2f} 0)">{"".join(bot.parts)}</g>')
    comp.points.extend((x + top_shift, y + rise) for x, y in top.points)
    comp.points.extend((x + bot_shift, y) for x, y in bot.points)
    return comp.svg(label, pad=72)


def on_paper(svg):
    start = svg.index('>', svg.index('<svg')) + 1
    return svg[:start] + f'<rect width="100%" height="100%" fill="{PAPER}"/>' + svg[start:]


def viewbox_of(svg):
    start = svg.index('viewBox="') + len('viewBox="')
    end = svg.index('"', start)
    return [float(n) for n in svg[start:end].split()]


def inner_of(svg):
    inner_start = svg.index('>', svg.index('<svg')) + 1
    inner_end = svg.rindex('</svg>')
    return svg[inner_start:inner_end]


def embed_h(svg, x, y, target_h):
    _, _, vw, vh = viewbox_of(svg)
    scale = target_h / vh
    return f'<g transform="translate({x:.2f} {y:.2f}) scale({scale:.5f})">{inner_of(svg)}</g>', vw * scale


def wrap_board(rows):
    """rows: list of (title, line, color_svg, mono_svg, kind)."""
    width = 1100
    y = 88
    blocks = []
    for title, line, color, mono, kind in rows:
        mark_h = 176 if kind == 'pile' else 112
        blocks.append((y, title, line, color, mono, kind, mark_h))
        y += 58 + mark_h + 26
    height = y + 16
    chunks = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" '
        f'aria-label="Planche des variantes de logo MISE !">',
        f'<rect width="{width}" height="{height}" fill="{PAPER}"/>',
        f'<text x="36" y="40" fill="{TYPE}" font-family="ui-sans-serif,system-ui,sans-serif" '
        f'font-size="22" font-weight="750">Études de logo — le mot « mise ! »</text>',
        f'<text x="36" y="62" fill="{MUTED}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13">'
        f'La piste principale est déjà dans l’appli. À droite : une seule encre, puis le même dessin en tout petit.</text>',
    ]
    for top, title, line, color, mono, kind, mark_h in blocks:
        chunks.append(
            f'<text x="36" y="{top + 4}" fill="{TYPE}" font-family="ui-sans-serif,system-ui,sans-serif" '
            f'font-size="15" font-weight="750">{title}</text>'
        )
        chunks.append(
            f'<text x="36" y="{top + 24}" fill="{MUTED}" font-family="ui-sans-serif,system-ui,sans-serif" '
            f'font-size="13">{line}</text>'
        )
        drawn, color_w = embed_h(color, 36, top + 36, mark_h)
        chunks.append(drawn)
        mono_h = mark_h * 0.78
        drawn, mono_w = embed_h(mono, 36 + color_w + 28, top + 36 + (mark_h - mono_h) / 2, mono_h)
        chunks.append(drawn)
        tiny_h = 64 if kind == 'pile' else 36
        tiny_x = 36 + color_w + 28 + mono_w + 28
        drawn, _ = embed_h(mono, tiny_x, top + 36 + (mark_h - tiny_h) / 2, tiny_h)
        chunks.append(drawn)
    chunks.append('</svg>')
    return ''.join(chunks)


def pile_icon(mark_svg):
    """Square icon: the stacked word in white on the ink. One color of ink, plus white."""
    _, _, vw, vh = viewbox_of(mark_svg)
    side = 512
    pad = 48
    scale = (side - pad * 2) / max(vw, vh)
    dw, dh = vw * scale, vh * scale
    x = (side - dw) / 2
    y = (side - dh) / 2
    inner = inner_of(mark_svg).replace(TYPE, '#ffffff').replace(INK, '#ffffff')
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {side} {side}" role="img" '
        f'aria-label="Icône pile, mi sur se !">'
        f'<rect width="{side}" height="{side}" rx="112" fill="{INK}"/>'
        f'<g transform="translate({x:.2f} {y:.2f}) scale({scale:.5f})">{inner}</g>'
        f'</svg>'
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    studies = [
        (
            'variante-mailloche',
            'Mailloche',
            'Le ! devient une mailloche : le manche reste la lettre, la tête remplace le point.',
            lambda accent: build('mise !', 'mallet', 'Variante mailloche', accent),
            'word',
        ),
        (
            'variante-jeton',
            'Jeton',
            'Le point du i est un jeton à cinq côtés. Le point du ! reste un rond, de la même encre.',
            lambda accent: build('mise !', 'token', 'Variante jeton', accent),
            'word',
        ),
        (
            'variante-onde',
            'Onde',
            'Le point du i est une onde courte, du même poids qu’un point, pour rester lisible en petit.',
            lambda accent: build('mise !', 'wave', 'Variante onde', accent),
            'word',
        ),
        (
            'variante-tampon',
            'Tampon',
            'Une seconde passe, décalée, dans la même encre : le mot a l’air tiré au tampon.',
            lambda accent: build_tampon('Variante tampon', accent),
            'word',
        ),
        (
            'variante-pile',
            'Pile',
            '« mi » posé sur « se ! ». Le mot entier tient dans l’icône, pas seulement « m! ».',
            lambda accent: build_pile_real('Variante pile', accent),
            'pile',
        ),
    ]
    rows = []
    # Reference row: the live wordmark, one ink and with the accent dots.
    rows.append((
        'Principale — dans l’appli',
        'Minuscules arrondies. Le point du i et le point du ! sont la seule touche d’encre.',
        build('mise !', 'circle', 'Piste principale'),
        build('mise !', 'circle', 'Piste principale, une encre', accent=TYPE),
        'word',
    ))
    for slug, title, line, factory, kind in studies:
        color = factory(INK)
        mono = factory(TYPE)
        (OUT / f'{slug}.svg').write_text(on_paper(color))
        (OUT / f'{slug}-encre.svg').write_text(on_paper(mono))
        if kind == 'pile':
            (OUT / 'variante-pile-icone.svg').write_text(pile_icon(color))
        rows.append((title, line, color, mono, kind))
    board = wrap_board(rows)
    (OUT / 'planche.svg').write_text(board)
    print(f'wrote {len(studies)} studies and planche.svg')


if __name__ == '__main__':
    main()
