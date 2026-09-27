#!/usr/bin/env python3
"""Outline the mise ! wordmark from Fredoka (SIL OFL) and write the logo files.

The two dots are perfect circles of the same size. The i dot stays above the
stem. The ! dot stays under the stem. Letters and dots are separate so the
interface can color them apart, and a one-ink print can use the same drawing.
"""
import json
from pathlib import Path

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
FONT = ROOT / 'src' / 'fonts' / 'Fredoka.ttf'
CSS = ROOT / 'src' / 'identity.css'


def read_ink():
    text = CSS.read_text()
    for line in text.splitlines():
        if '--ink:' in line and '#' in line:
            start = line.index('#')
            return line[start:start + 7].upper()
    raise SystemExit('--ink missing')


def flatten(op, pts, out, steps=10):
    if op == 'moveTo':
        out.append(pts[0])
    elif op == 'lineTo':
        out.append(pts[0])
    elif op == 'qCurveTo':
        # TrueType quadratic: last point is on-curve, previous are off.
        start = out[-1]
        controls = list(pts)
        on = controls.pop()
        # Implied on-curve points between consecutive off-curves.
        points = [start]
        for i, c in enumerate(controls):
            points.append(c)
            if i < len(controls) - 1:
                nxt = controls[i + 1]
                points.append(((c[0] + nxt[0]) / 2, (c[1] + nxt[1]) / 2))
        points.append(on)
        i = 0
        while i + 2 < len(points):
            p0, p1, p2 = points[i], points[i + 1], points[i + 2]
            for s in range(1, steps + 1):
                t = s / steps
                u = 1 - t
                out.append((u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
                            u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]))
            i += 2
    elif op == 'curveTo':
        p0 = out[-1]
        p1, p2, p3 = pts
        for s in range(1, steps + 1):
            t = s / steps
            u = 1 - t
            out.append((
                u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
                u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
            ))
    elif op == 'closePath':
        if out and out[0] != out[-1]:
            out.append(out[0])


def contours_of(glyph):
    pen = RecordingPen()
    glyph.draw(pen)
    contours = []
    current = []
    for op, pts in pen.value:
        current.append((op, pts))
        if op == 'closePath':
            contours.append(current)
            current = []
    return contours


def contour_box(contour):
    xs, ys = [], []
    for op, pts in contour:
        for p in pts:
            if isinstance(p, tuple) and len(p) == 2 and isinstance(p[0], (int, float)):
                xs.append(p[0])
                ys.append(p[1])
    return min(xs), min(ys), max(xs), max(ys)


def contour_path(contour, ox, baseline):
    def mp(p):
        return (ox + p[0], baseline - p[1])

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


def layout():
    font = instantiateVariableFont(TTFont(FONT), {'wght': 680, 'wdth': 100}, inplace=False)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    sequence = ['m', 'i', 's', 'e', ' ', '!']
    cursor = 0
    letters = []
    dots = []
    tops = []
    bottoms = []
    for ch in sequence:
        if ch == ' ':
            cursor += glyphs[cmap[ord(' ')]].width * 0.42
            continue
        glyph = glyphs[cmap[ord(ch)]]
        found = contours_of(glyph)
        keep = found
        if ch in ('i', '!'):
            boxes = [(contour_box(c), c) for c in found]
            # The dot is the smaller contour.
            boxes.sort(key=lambda item: (item[0][2] - item[0][0]) * (item[0][3] - item[0][1]))
            (x0, y0, x1, y1), dot = boxes[0]
            keep = [c for c in found if c is not dot]
            dots.append({
                'cx': cursor + (x0 + x1) / 2,
                'cy': (y0 + y1) / 2,
                'r': min(x1 - x0, y1 - y0) / 2,
                'ch': ch,
            })
        for contour in keep:
            x0, y0, x1, y1 = contour_box(contour)
            tops.append(y1)
            bottoms.append(y0)
            letters.append((cursor, contour))
        cursor += glyph.width
    radius = sum(dot['r'] for dot in dots) / len(dots)
    for dot in dots:
        dot['r'] = radius
    pad = 36
    baseline = max(tops) + pad
    width = cursor + pad
    height = baseline - (min(bottoms) - pad)
    letter_paths = [contour_path(contour, ox, baseline) for ox, contour in letters]
    svg_dots = []
    for dot in dots:
        svg_dots.append({
            'cx': round(dot['cx'] + 0, 2),
            'cy': round(baseline - dot['cy'], 2),
            'r': round(radius, 2),
        })
    return {
        'width': round(width, 2),
        'height': round(height, 2),
        'letters': ''.join(letter_paths),
        'dots': svg_dots,
    }


# Tampon: a second pull, down and to the right, in SVG space (y grows downward).
# Same shift as the study in docs/design/variante-tampon.svg.
STAMP_X = 40
STAMP_Y = 26
# The full word does not hold on an icon. m! keeps the effect with a stronger shift.
ICON_STAMP_X = 86
ICON_STAMP_Y = 58


def dots_of(mark):
    if 'dots' in mark:
        return mark['dots']
    return [mark['dot']]


def circle_tags(dots, fill=None, cls=''):
    attrs = []
    if cls:
        attrs.append(f'class="{cls}"')
    if fill:
        attrs.append(f'fill="{fill}"')
    extra = (' ' + ' '.join(attrs)) if attrs else ''
    return ''.join(
        f'<circle{extra} cx="{d["cx"]}" cy="{d["cy"]}" r="{d["r"]}"/>' for d in dots
    )


def stamp_body(mark, sx, sy, letter=None, dot=None, ghost=None, classed=False):
    dots = dots_of(mark)
    if classed:
        return (
            f'<g class="stampGhost" transform="translate({sx} {sy})">'
            f'<path d="{mark["letters"]}"/>{circle_tags(dots)}</g>'
            f'<path class="letters" d="{mark["letters"]}"/>{circle_tags(dots, cls="markDot")}'
        )
    return (
        f'<g transform="translate({sx} {sy})" fill="{ghost}">'
        f'<path d="{mark["letters"]}"/>{circle_tags(dots)}</g>'
        f'<path fill="{letter}" d="{mark["letters"]}"/>{circle_tags(dots, fill=dot)}'
    )


def stamped_size(mark, sx, sy):
    return round(mark['width'] + sx, 2), round(mark['height'] + sy, 2)


def svg_wordmark(mark, letter, dot, label, sx=STAMP_X, sy=STAMP_Y):
    width, height = stamped_size(mark, sx, sy)
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'role="img" aria-label="{label}">'
        f'{stamp_body(mark, sx, sy, letter, dot, letter)}</svg>'
    )


def icon_mark(mark, ink):
    """Lowercase m! on an ink tile. White, so it stays readable when small."""
    # Rebuild just m and ! from the full mark by cropping is hard.
    # The full layout starts at m and ends at !. We draw m! from a second layout.
    return mark


def layout_m_bang():
    full = layout()
    # Dedicated tighter lockup: same font, only m and !.
    font = instantiateVariableFont(TTFont(FONT), {'wght': 680, 'wdth': 100}, inplace=False)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    cursor = 0
    letters = []
    dot = None
    tops, bottoms = [], []
    for ch in ('m', '!'):
        glyph = glyphs[cmap[ord(ch)]]
        found = contours_of(glyph)
        keep = found
        if ch == '!':
            boxes = [(contour_box(c), c) for c in found]
            boxes.sort(key=lambda item: (item[0][2] - item[0][0]) * (item[0][3] - item[0][1]))
            (x0, y0, x1, y1), dot_c = boxes[0]
            keep = [c for c in found if c is not dot_c]
            dot = {
                'cx': cursor + (x0 + x1) / 2,
                'cy': (y0 + y1) / 2,
                'r': min(x1 - x0, y1 - y0) / 2,
            }
        for contour in keep:
            x0, y0, x1, y1 = contour_box(contour)
            tops.append(y1)
            bottoms.append(y0)
            letters.append((cursor, contour))
        cursor += glyph.width + (40 if ch == 'm' else 0)
    pad = 80
    baseline = max(tops) + pad
    width = cursor + pad
    height = baseline - (min(bottoms) - pad)
    return {
        'width': width,
        'height': height,
        'letters': ''.join(contour_path(c, ox, baseline) for ox, c in letters),
        'dot': {
            'cx': dot['cx'],
            'cy': baseline - dot['cy'],
            'r': dot['r'],
        },
        'baseline': baseline,
    }


def signed_area(poly):
    area = 0
    for i in range(len(poly) - 1):
        area += poly[i][0] * poly[i + 1][1] - poly[i + 1][0] * poly[i][1]
    return area / 2


def path_polygons(path_d):
    tokens = []
    num = ''
    for ch in path_d:
        if ch in 'MLQCZ':
            if num:
                tokens.append(float(num))
                num = ''
            tokens.append(ch)
        elif ch in ' -0123456789.':
            if ch == '-' and num and num[-1] != 'e':
                tokens.append(float(num))
                num = '-'
            elif ch == ' ' and num:
                tokens.append(float(num))
                num = ''
            else:
                num += ch
    if num:
        tokens.append(float(num))
    polys = []
    current = []
    i = 0
    cx = cy = 0
    while i < len(tokens):
        item = tokens[i]
        if item == 'M':
            if len(current) >= 3:
                polys.append(current)
            cx, cy = tokens[i + 1], tokens[i + 2]
            current = [(cx, cy)]
            i += 3
        elif item == 'L':
            cx, cy = tokens[i + 1], tokens[i + 2]
            current.append((cx, cy))
            i += 3
        elif item == 'Q':
            p0 = (cx, cy)
            c = (tokens[i + 1], tokens[i + 2])
            on = (tokens[i + 3], tokens[i + 4])
            for s in range(1, 9):
                t = s / 8
                u = 1 - t
                current.append((u * u * p0[0] + 2 * u * t * c[0] + t * t * on[0],
                                u * u * p0[1] + 2 * u * t * c[1] + t * t * on[1]))
            cx, cy = on
            i += 5
        elif item == 'C':
            p0 = (cx, cy)
            p1, p2, p3 = (tokens[i + 1], tokens[i + 2]), (tokens[i + 3], tokens[i + 4]), (tokens[i + 5], tokens[i + 6])
            for s in range(1, 13):
                t = s / 12
                u = 1 - t
                current.append((
                    u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
                ))
            cx, cy = p3
            i += 7
        elif item == 'Z':
            if current and current[0] != current[-1]:
                current.append(current[0])
            if len(current) >= 3:
                polys.append(current)
            current = []
            i += 1
        else:
            i += 1
    if len(current) >= 3:
        polys.append(current)
    return polys


def paint_polygons(image, polys, fill, scale, ox, oy):
    if not polys:
        return
    areas = [signed_area(poly) for poly in polys]
    outer_sign = 1 if sum(areas) >= 0 else -1
    mask = Image.new('L', image.size, 0)
    pen = ImageDraw.Draw(mask)

    def xy(poly):
        return [(ox + p[0] * scale, oy + p[1] * scale) for p in poly]

    for poly, area in zip(polys, areas):
        if area * outer_sign >= 0:
            pen.polygon(xy(poly), fill=255)
    for poly, area in zip(polys, areas):
        if area * outer_sign < 0:
            pen.polygon(xy(poly), fill=0)
    color = Image.new('RGBA', image.size, fill)
    image.paste(color, (0, 0), mask)


def draw_paths(draw, path_d, fill, scale, ox, oy):
    # Parse the compact path we generated (M/L/Q/C/Z with absolute coords).
    tokens = []
    num = ''
    cmd = None
    for ch in path_d:
        if ch in 'MLQCZ':
            if num:
                tokens.append(float(num))
                num = ''
            tokens.append(ch)
        elif ch in ' -0123456789.':
            if ch == '-' and num and num[-1] != 'e':
                tokens.append(float(num))
                num = '-'
            elif ch == ' ' and num:
                tokens.append(float(num))
                num = ''
            else:
                num += ch
    if num:
        tokens.append(float(num))
    polys = []
    current = []
    i = 0
    cx = cy = 0
    while i < len(tokens):
        item = tokens[i]
        if item == 'M':
            if current:
                polys.append(current)
            cx, cy = tokens[i + 1], tokens[i + 2]
            current = [(cx, cy)]
            i += 3
        elif item == 'L':
            cx, cy = tokens[i + 1], tokens[i + 2]
            current.append((cx, cy))
            i += 3
        elif item == 'Q':
            pts = [(cx, cy)]
            j = i + 1
            while j < len(tokens) and not isinstance(tokens[j], str):
                pts.append((tokens[j], tokens[j + 1]))
                j += 2
            # pairs of control, on
            p = pts[0]
            k = 1
            while k + 1 < len(pts):
                c, on = pts[k], pts[k + 1]
                for s in range(1, 9):
                    t = s / 8
                    u = 1 - t
                    current.append((u * u * p[0] + 2 * u * t * c[0] + t * t * on[0],
                                    u * u * p[1] + 2 * u * t * c[1] + t * t * on[1]))
                p = on
                k += 2
            cx, cy = p
            i = j
        elif item == 'C':
            p1, p2, p3 = (tokens[i + 1], tokens[i + 2]), (tokens[i + 3], tokens[i + 4]), (tokens[i + 5], tokens[i + 6])
            p0 = (cx, cy)
            for s in range(1, 13):
                t = s / 12
                u = 1 - t
                current.append((
                    u**3 * p0[0] + 3 * u**2 * t * p1[0] + 3 * u * t**2 * p2[0] + t**3 * p3[0],
                    u**3 * p0[1] + 3 * u**2 * t * p1[1] + 3 * u * t**2 * p2[1] + t**3 * p3[1],
                ))
            cx, cy = p3
            i += 7
        elif item == 'Z':
            if current and current[0] != current[-1]:
                current.append(current[0])
            polys.append(current)
            current = []
            i += 1
        else:
            i += 1
    if current:
        polys.append(current)

    def xy(p):
        return (ox + p[0] * scale, oy + p[1] * scale)

    for poly in polys:
        if len(poly) >= 3:
            draw.polygon([xy(p) for p in poly], fill=fill)


def raster_wordmark(mark, size_h, letter, dot):
    scale = size_h / mark['height']
    w = max(1, round(mark['width'] * scale))
    h = max(1, round(mark['height'] * scale))
    image = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    paint_polygons(image, path_polygons(mark['letters']), letter, scale, 0, 0)
    pen = ImageDraw.Draw(image)
    for d in mark['dots']:
        r = d['r'] * scale
        cx, cy = d['cx'] * scale, d['cy'] * scale
        pen.ellipse((cx - r, cy - r, cx + r, cy + r), fill=dot)
    return image


def raster_icon(tile, size, ink, sx=ICON_STAMP_X, sy=ICON_STAMP_Y):
    image = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    pen = ImageDraw.Draw(image)
    radius = int(size * 0.22)
    pen.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=ink + (255,))
    pad = size * 0.18
    avail = size - pad * 2
    scale = min(avail / (tile['width'] + sx), avail / (tile['height'] + sy))
    dw = (tile['width'] + sx) * scale
    dh = (tile['height'] + sy) * scale
    ox, oy = (size - dw) / 2, (size - dh) / 2
    white = (255, 255, 255, 255)
    dots = dots_of(tile)
    paint_polygons(image, path_polygons(tile['letters']), white, scale, ox + sx * scale, oy + sy * scale)
    pen2 = ImageDraw.Draw(image)
    for d in dots:
        r = d['r'] * scale
        cx = ox + (d['cx'] + sx) * scale
        cy = oy + (d['cy'] + sy) * scale
        pen2.ellipse((cx - r, cy - r, cx + r, cy + r), fill=white)
    paint_polygons(image, path_polygons(tile['letters']), white, scale, ox, oy)
    for d in dots:
        r = d['r'] * scale
        cx = ox + d['cx'] * scale
        cy = oy + d['cy'] * scale
        pen2.ellipse((cx - r, cy - r, cx + r, cy + r), fill=white)
    return image


def bits_from(image):
    # Black pixels become 1. Used by the thermal label.
    w, h = image.size
    rows = []
    for y in range(h):
        bits = []
        for x in range(w):
            r, g, b, a = image.getpixel((x, y))
            bits.append('1' if a > 128 and r < 40 else '0')
        rows.append(''.join(bits))
    return w, h, rows


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)


def write_android(tile, ink, sx=ICON_STAMP_X, sy=ICON_STAMP_Y):
    box = 72
    scale = min(box / (tile['width'] + sx), box / (tile['height'] + sy))
    ox = (108 - (tile['width'] + sx) * scale) / 2
    oy = (108 - (tile['height'] + sy) * scale) / 2
    dot = tile['dot']
    circle = (
        f'M{dot["cx"] - dot["r"]},{dot["cy"]} '
        f'a{dot["r"]},{dot["r"]} 0 1,1 {dot["r"] * 2},0 '
        f'a{dot["r"]},{dot["r"]} 0 1,1 {-dot["r"] * 2},0'
    )
    group = (
        f'<group android:translateX="{ox:.2f}" android:translateY="{oy:.2f}" '
        f'android:scaleX="{scale:.5f}" android:scaleY="{scale:.5f}">'
        f'<group android:translateX="{sx}" android:translateY="{sy}">'
        f'<path android:fillColor="#FFFFFF" android:pathData="{tile["letters"]}"/>'
        f'<path android:fillColor="#FFFFFF" android:pathData="{circle}"/>'
        f'</group>'
        f'<path android:fillColor="#FFFFFF" android:pathData="{tile["letters"]}"/>'
        f'<path android:fillColor="#FFFFFF" android:pathData="{circle}"/>'
        f'</group>'
    )
    vector = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<vector xmlns:android="http://schemas.android.com/apk/res/android"\n'
        '    android:width="108dp"\n'
        '    android:height="108dp"\n'
        '    android:viewportWidth="108"\n'
        '    android:viewportHeight="108">\n'
        f'    {group}\n'
        '</vector>\n'
    )
    mono = vector.replace('#FFFFFF', '#FF000000')
    write(ROOT / 'android/app/src/main/res/drawable/ic_launcher_foreground.xml', vector)
    write(ROOT / 'android/app/src/main/res/drawable/ic_launcher_monochrome.xml', mono)
    write(ROOT / 'android/app/src/main/res/drawable/ic_launcher_background.xml', f'''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path android:fillColor="{ink}" android:pathData="M0,0h108v108h-108z"/>
</vector>
''')


def write_splash(ink):
    icon = (ROOT / 'public' / 'icon.svg').read_text().replace(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="mise !">',
        '<svg viewBox="0 0 64 64" width="88" height="88" aria-hidden="true">'
    )
    html = ROOT / 'index.html'
    text = html.read_text()
    start = text.find('<div class="splash">')
    end = text.find('</div></div><script')
    if start < 0 or end < 0:
        raise SystemExit('splash introuvable')
    html.write_text(text[:start] + f'<div class="splash">{icon}<b>mise !</b>' + text[end:])


def main():
    ink = read_ink()
    ink_rgb = tuple(int(ink[i:i + 2], 16) for i in (1, 3, 5))
    mark = layout()
    bang = layout_m_bang()
    letter = '#161513'
    write(ROOT / 'public' / 'brand' / 'logo.svg', svg_wordmark(mark, letter, ink, 'mise !'))
    write(ROOT / 'public' / 'brand' / 'logo-mono.svg', svg_wordmark(mark, '#000', '#000', 'mise !'))
    write(ROOT / 'public' / 'brand' / 'logo-mono-light.svg', svg_wordmark(mark, '#fff', '#fff', 'mise !'))
    width, height = stamped_size(mark, STAMP_X, STAMP_Y)
    inline = (
        f'<svg class="miseWordmark" viewBox="0 0 {width} {height}" role="img" aria-label="mise !">'
        f'{stamp_body(mark, STAMP_X, STAMP_Y, classed=True)}</svg>'
    )
    write(ROOT / 'src' / 'brand' / 'wordmark.svg', inline)

    # App icon: m! with the stamp. The full word does not stay readable this small.
    tile_w = bang['width'] + ICON_STAMP_X
    tile_h = bang['height'] + ICON_STAMP_Y
    scale = min(48 / tile_w, 44 / tile_h)
    ox = 8 + (48 - tile_w * scale) / 2
    oy = 10 + (44 - tile_h * scale) / 2
    icon_inner = stamp_body(bang, ICON_STAMP_X, ICON_STAMP_Y, '#fff', '#fff', '#fff')
    icon_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="mise !">'
        f'<rect width="64" height="64" rx="14" fill="{ink}"/>'
        f'<g transform="translate({ox:.2f},{oy:.2f}) scale({scale:.5f})">{icon_inner}</g></svg>'
    )
    write(ROOT / 'public' / 'icon.svg', icon_svg)
    write(ROOT / 'public' / 'favicon.svg', icon_svg)
    mask_scale = min(40 / tile_w, 40 / tile_h)
    mx = (64 - tile_w * mask_scale) / 2
    my = (64 - tile_h * mask_scale) / 2
    mask = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="mise !">'
        f'<rect width="64" height="64" fill="{ink}"/>'
        f'<g transform="translate({mx:.2f},{my:.2f}) scale({mask_scale:.5f})">{icon_inner}</g></svg>'
    )
    write(ROOT / 'public' / 'icon-maskable.svg', mask)

    # PNGs
    for name, size, radius_ratio in (('icon-192.png', 192, 0.22), ('icon-512.png', 512, 0.22), ('apple-touch-icon.png', 180, 0.22)):
        image = raster_icon(bang, size, ink_rgb)
        image.save(ROOT / 'public' / name)

    # Thermal label: one ink, no second pull. The offset muddies the word at this size.
    label = raster_wordmark(mark, 52, (0, 0, 0, 255), (0, 0, 0, 255))
    w, h, rows = bits_from(label)
    packed = []
    for row in rows:
        # pack bits into hex bytes
        chunk = row + '0' * ((8 - len(row) % 8) % 8)
        packed.append(''.join(f'{int(chunk[i:i+8], 2):02x}' for i in range(0, len(chunk), 8)))
    js = (
        'export const WORDMARK_BITMAP = ' + json.dumps({'width': w, 'height': h, 'rows': packed}) + '\n'
    )
    write(ROOT / 'src' / 'wordmark-bitmap.js', js)

    # Ink comparison sheet: same letters, three dot colors.
    def tile(dot_hex, title, note, x):
        return (
            f'<g transform="translate({x},24)">'
            f'<svg x="0" y="0" width="200" height="{200 * mark["height"] / mark["width"]:.1f}" '
            f'viewBox="0 0 {mark["width"]} {mark["height"]}">'
            f'<path fill="#161513" d="{mark["letters"]}"/>'
            + ''.join(f'<circle fill="{dot_hex}" cx="{d["cx"]}" cy="{d["cy"]}" r="{d["r"]}"/>' for d in mark['dots'])
            + f'</svg>'
            f'<text x="0" y="78" fill="#161513" font-family="ui-sans-serif,system-ui,sans-serif" font-size="14" font-weight="700">{title}</text>'
            f'<text x="0" y="96" fill="#5c5852" font-family="ui-sans-serif,system-ui,sans-serif" font-size="12">{note}</text>'
            f'</g>'
        )
    # The nested svg y for text must sit below the wordmark. Wordmark height in the 200-wide box:
    shown_h = 200 * mark['height'] / mark['width']
    sheet = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 150" role="img" aria-label="Trois encres pour les points de mise !">'
        f'<rect width="720" height="150" fill="#f4f1ea"/>'
    )
    # Simpler horizontal wordmarks.
    def row(dot_hex, caption, x):
        shown = 150
        scale = shown / (mark['width'] + STAMP_X)
        return (
            f'<g transform="translate({x},18)">'
            f'<g transform="scale({scale:.5f})">{stamp_body(mark, STAMP_X, STAMP_Y, "#161513", dot_hex, "#161513")}</g>'
            f'<text x="0" y="{scale * (mark["height"] + STAMP_Y) + 18:.1f}" fill="#161513" font-family="ui-sans-serif,system-ui,sans-serif" font-size="13" font-weight="700">{caption}</text>'
            f'</g>'
        )
    sheet = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 120" role="img" aria-label="Trois encres pour les points de mise !">'
        '<rect width="640" height="120" fill="#f4f1ea"/>'
        + row(ink, f'{ink} · retenue', 16)
        + row('#C23A1B', '#C23A1B · vermillon', 220)
        + row('#0F6E45', '#0F6E45 · vert', 430)
        + '</svg>'
    )
    write(ROOT / 'public' / 'brand' / 'encres.svg', sheet)
    for name, color, label in (
        ('encre-bleu.svg', ink, 'Encre retenue'),
        ('encre-vermillon.svg', '#C23A1B', 'Variante vermillon'),
        ('encre-vert.svg', '#0F6E45', 'Variante vert affiche'),
    ):
        write(ROOT / 'public' / 'brand' / name, svg_wordmark(mark, letter, color, label))

    write_android(bang, ink)
    write_splash(ink)
    meta = {
        'ink': ink,
        'viewBox': [width, height],
        'dots': mark['dots'],
        'labelBitmap': [w, h],
    }
    write(ROOT / 'src' / 'brand' / 'wordmark.json', json.dumps(meta))
    print(json.dumps(meta))


if __name__ == '__main__':
    main()
