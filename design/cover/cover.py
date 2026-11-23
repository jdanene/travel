#!/usr/bin/env python3
"""Draw the Travel README cover as one SVG file.

An original poster in the manner of old-school crime-game box art: inked
panels in a black grid. Bali at sunset, Borobudur at dawn, a surf beach, a
full moon party on a beach with the Singapore skyline across the water, and
three women in sunglasses. No game logo, name or character is copied.

Usage: python3 -I cover.py OUT.svg
"""
import math
import random
import sys

INK = "#111111"
NEON = ["#FF4FD8", "#3DF5FF", "#B6FF3D", "#FFD23D"]
rng = random.Random(11)
DEFS = []

HERO = dict(skin="#C98B5F", shade="#A86E47", hair="#2A1810", hair_hi="#4A2E1E",
            top="#E63946", top_hi="#FF8A94", bottom="#3D6FB6", bottom_shade="#2A4F86", lip="#A8243A")
G1 = dict(skin="#A86B43", shade="#8A5434", hair="#160C07", hair_hi="#3A2216",
          top="#FFC93C", top_hi="#FFE9A0", bottom="#F2EEE4", bottom_shade="#BDB5A6", lip="#9E1F3A")
G2 = dict(skin="#DDA67C", shade="#BE865E", hair="#4E2414", hair_hi="#7A3B22",
          top="#17B3A3", top_hi="#7FE8DC", bottom="#FF5DA2", bottom_shade="#C93B7C", lip="#B8323F")
PORTRAIT = dict(skin="#B97B4F", shade="#98603A", hair="#120A06", hair_hi="#3A241A",
                top="#FF3CAC", top_hi="#FF9AD4", bottom="#2B2B2B", bottom_shade="#111111", lip="#C2183C")

PANELS = [(8, 8, 344, 614), (360, 8, 480, 206), (848, 8, 344, 292), (360, 222, 480, 198),
          (360, 428, 236, 194), (604, 428, 236, 194), (848, 308, 344, 314)]


def n(v):
    """Format a number compactly: n(2.0) -> '2', n(2.345) -> '2.3'."""
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


def vgrad(gid, stops, x2=0, y2=1):
    """Register a linear gradient and return its url(); vertical by default."""
    s = "".join(f'<stop offset="{o}" stop-color="{c}"/>' for o, c in stops)
    DEFS.append(f'<linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">{s}</linearGradient>')
    return f"url(#{gid})"


def clip(cid, x, y, w, h):
    """Register a rectangular clip and return the opening <g> that uses it."""
    DEFS.append(f'<clipPath id="{cid}"><rect x="{x}" y="{y}" width="{w}" height="{h}"/></clipPath>')
    return f'<g clip-path="url(#{cid})">'


def tube(d, w, color):
    """Return an inked limb: a wide dark stroke under a coloured one."""
    return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{n(w + 4.5)}" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{n(w)}" stroke-linecap="round"/>')


def curls(cs, fill, ring=3.0):
    """Return a cluster of circles that share one ink outline."""
    under = "".join(f'<circle cx="{x}" cy="{y}" r="{n(r + ring)}"/>' for x, y, r in cs)
    over = "".join(f'<circle cx="{x}" cy="{y}" r="{r}"/>' for x, y, r in cs)
    return f'<g fill="{INK}">{under}</g><g fill="{fill}">{over}</g>'


BODY = ("M -7 48 L -8 64 C -16 68 -30 70 -40 76 C -47 80 -47 92 -43 102 "
        "C -45 112 -44 124 -36 134 C -30 146 -26 158 -27 168 C -29 182 -46 194 -54 214 "
        "C -58 232 -55 256 -47 282 C -43 296 -42 306 -42 314 C -44 330 -42 350 -35 368 "
        "C -32 376 -30 382 -30 388 L -34 398 L -16 398 L -17 386 C -18 368 -22 350 -22 332 "
        "C -22 320 -20 310 -19 302 C -17 286 -12 262 -4 242 L 0 238 L 4 242 "
        "C 12 262 17 286 19 302 C 20 310 22 320 22 332 C 22 350 18 368 17 386 "
        "L 16 398 L 34 398 L 30 388 C 30 382 32 376 35 368 C 42 350 44 330 42 314 "
        "C 42 306 43 296 47 282 C 55 256 58 232 54 214 C 46 194 29 182 27 168 "
        "C 26 158 30 146 36 134 C 44 124 45 112 43 102 C 47 92 47 80 40 76 "
        "C 30 70 16 68 8 64 L 7 48 Z")
SHORTS = ("M -27 168 L 27 168 C 29 182 46 194 54 214 C 56 226 56 236 55 244 "
          "L 7 254 L 0 244 L -7 254 L -55 244 C -56 236 -56 226 -54 214 "
          "C -46 194 -29 182 -27 168 Z")
CUP_L = "M -38 104 C -40 118 -30 130 -17 130 C -7 130 -2 122 -1 110 C -8 103 -26 99 -38 104 Z"
CUP_R = "M 38 104 C 40 118 30 130 17 130 C 7 130 2 122 1 110 C 8 103 26 99 38 104 Z"
BACK_CURLS = [(0, 4, 20), (-15, 8, 17), (15, 8, 17), (-25, 22, 15), (25, 22, 15),
              (-29, 40, 15), (29, 40, 15), (-32, 58, 15), (32, 58, 15), (-33, 76, 14),
              (33, 76, 14), (-29, 92, 12), (29, 92, 12), (-21, 64, 13), (21, 64, 13),
              (-9, -2, 13), (9, -2, 13)]
FRONT_CURLS = [(-13, 11, 7), (-5, 7, 7), (4, 6, 7), (12, 9, 7), (17, 15, 6),
               (-17, 16, 6), (-19, 23, 5), (19, 22, 5)]


def woman(c, tx, ty, s, flip=False, pose="glasses"):
    """Return one woman in a bikini top and denim shorts.

    Local units: head top near y -19, feet on y 398. `pose` is "glasses"
    (one hand on the hip, one lowering the sunglasses) or "relaxed".
    """
    sx = -s if flip else s
    p = [f'<g transform="translate({n(tx)} {n(ty)}) scale({n(sx)} {n(s)})" stroke-linejoin="round">',
         '<ellipse cx="0" cy="399" rx="62" ry="7" fill="#000" opacity="0.3"/>',
         curls(BACK_CURLS, c["hair"])]
    for x, y, r in BACK_CURLS[3:13]:
        p.append(f'<path d="M {n(x - r * 0.5)} {y} q {n(r * 0.5)} {n(-r * 0.6)} {r} 0" fill="none" '
                 f'stroke="{c["hair_hi"]}" stroke-width="2" stroke-linecap="round"/>')
    # upper arms sit behind the body
    if pose == "glasses":
        p.append(tube("M 38 86 Q 62 78 68 52", 13, c["skin"]))
    else:
        p.append(tube("M 38 86 Q 56 112 56 146", 13, c["skin"]))
    p.append(tube("M -38 86 Q -64 104 -66 140", 13, c["skin"]))
    # body and its shading
    p.append(f'<path d="{BODY}" fill="{c["skin"]}" stroke="{INK}" stroke-width="3"/>')
    sh = c["shade"]
    p.append(f'<path d="M -6 70 L -22 74 M 6 70 L 22 74" stroke="{sh}" stroke-width="1.6" stroke-linecap="round" fill="none"/>')
    p.append(f'<path d="M -22 140 Q -17 156 -19 168 M 22 140 Q 17 156 19 168" stroke="{sh}" stroke-width="1.6" fill="none" opacity="0.7"/>')
    p.append(f'<ellipse cx="0" cy="156" rx="1.6" ry="2.6" fill="{sh}"/>')
    p.append(f'<path d="M -34 306 q 6 4 12 0 M 34 306 q -6 4 -12 0" stroke="{sh}" stroke-width="1.6" fill="none"/>')
    p.append(f'<path d="M -34 128 Q -18 138 -4 128 M 34 128 Q 18 138 4 128" stroke="{sh}" stroke-width="1.8" fill="none"/>')
    # denim shorts
    bs = c["bottom_shade"]
    p.append(f'<path d="{SHORTS}" fill="{c["bottom"]}" stroke="{INK}" stroke-width="2.6"/>')
    p.append(f'<path d="M -28 176 L 28 176" stroke="{bs}" stroke-width="2"/>')
    p.append(f'<path d="M 0 176 L 0 236 M 0 228 Q 8 226 9 210 M -42 184 Q -31 197 -22 181 M 42 184 Q 31 197 22 181" '
             f'stroke="{bs}" stroke-width="1.6" fill="none"/>')
    p.append(f'<circle cx="0" cy="172" r="2.4" fill="#E5B53A" stroke="{INK}" stroke-width="1"/>')
    p.append('<path d="M -53 241 L -9 249 M 53 241 L 9 249" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="2 3" opacity="0.75"/>')
    # bikini top
    p.append(tube("M -22 102 L -11 66", 2.6, c["top"]))
    p.append(tube("M 22 102 L 11 66", 2.6, c["top"]))
    p.append(f'<path d="{CUP_L}" fill="{c["top"]}" stroke="{INK}" stroke-width="2.6"/>')
    p.append(f'<path d="{CUP_R}" fill="{c["top"]}" stroke="{INK}" stroke-width="2.6"/>')
    p.append(f'<path d="M -31 109 Q -25 104 -17 106 M 31 109 Q 25 104 17 106" stroke="{c["top_hi"]}" '
             f'stroke-width="2.2" fill="none" stroke-linecap="round"/>')
    p.append(f'<circle cx="0" cy="111" r="3" fill="{c["top"]}" stroke="{INK}" stroke-width="1.6"/>')
    # neck shadow, ears, head
    p.append(f'<path d="M -8 50 Q 0 60 8 50 L 8 58 Q 0 66 -8 58 Z" fill="{sh}"/>')
    for ex in (-17, 17):
        p.append(f'<ellipse cx="{ex}" cy="34" rx="3.6" ry="6" fill="{c["skin"]}" stroke="{INK}" stroke-width="2"/>')
    p.append(f'<ellipse cx="0" cy="32" rx="17" ry="22" fill="{c["skin"]}" stroke="{INK}" stroke-width="3"/>')
    # face
    p.append('<ellipse cx="-11" cy="40" rx="3.6" ry="2" fill="#E07A6A" opacity="0.35"/>'
             '<ellipse cx="11" cy="40" rx="3.6" ry="2" fill="#E07A6A" opacity="0.35"/>')
    p.append(f'<path d="M -14 22 Q -8 18 -2 21 M 14 22 Q 8 18 2 21" stroke="{c["hair"]}" stroke-width="2.2" fill="none" stroke-linecap="round"/>')
    p.append(f'<path d="M 0 33 C -1.5 37 -1 39.5 1.5 39.5" stroke="{sh}" stroke-width="1.5" fill="none" stroke-linecap="round"/>')
    p.append(f'<path d="M -6 44.5 C -3 42.5 -1 43.5 0 43.8 C 1 43.5 3 42.5 6 44.5 C 3 45.5 -3 45.5 -6 44.5 Z" fill="{c["lip"]}"/>')
    p.append(f'<path d="M -5.5 44.8 C -3 49 3 49 5.5 44.8 C 2 46 -2 46 -5.5 44.8 Z" fill="{c["lip"]}"/>')
    p.append('<ellipse cx="1.5" cy="46.6" rx="1.8" ry="0.8" fill="#FFFFFF" opacity="0.55"/>')
    # sunglasses with a sunset in the lenses
    p.append(f'<path d="M -16 29 L -18 33 M 16 29 L 18 33" stroke="{INK}" stroke-width="2"/>')
    for lx in (-8.5, 8.5):
        p.append(f'<ellipse cx="{lx}" cy="30" rx="7.5" ry="5.5" fill="url(#lens)" stroke="{INK}" stroke-width="2.2"/>')
    p.append(f'<path d="M -1.5 29 Q 0 27.5 1.5 29" stroke="{INK}" stroke-width="2" fill="none"/>')
    p.append('<path d="M -12.5 27.5 L -9.5 25.8 M 4.5 27.5 L 7.5 25.8" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/>')
    p.append(curls(FRONT_CURLS, c["hair"], ring=2.4))
    # gold: hoops, chain
    p.append('<g fill="none" stroke-width="2.2" stroke="#E5B53A"><circle cx="-18" cy="45" r="6"/><circle cx="18" cy="45" r="6"/></g>')
    p.append('<path d="M -9 64 Q 0 77 9 64" stroke="#E5B53A" stroke-width="1.5" fill="none"/><circle cx="0" cy="74.5" r="2" fill="#E5B53A"/>')
    p.append(f'<path d="M -33 392 L -17 392 M 33 392 L 17 392" stroke="{INK}" stroke-width="3" stroke-linecap="round"/>')
    # forearms in front of the body
    p.append(tube("M -66 140 Q -64 170 -42 190", 11.5, c["skin"]))
    p.append(f'<ellipse cx="-39" cy="192" rx="8" ry="6" transform="rotate(25 -39 192)" fill="{c["skin"]}" stroke="{INK}" stroke-width="2.4"/>')
    p.append('<path d="M -43.5 180 L -52.5 188" stroke="#E5B53A" stroke-width="2.6"/>')
    if pose == "glasses":
        p.append(tube("M 68 52 Q 52 30 24 28", 11.5, c["skin"]))
        p.append(f'<ellipse cx="21" cy="28" rx="7" ry="5.5" transform="rotate(-20 21 28)" fill="{c["skin"]}" stroke="{INK}" stroke-width="2.4"/>')
    else:
        p.append(tube("M 56 146 Q 58 176 52 204", 11.5, c["skin"]))
        p.append(f'<ellipse cx="51" cy="208" rx="6" ry="8" fill="{c["skin"]}" stroke="{INK}" stroke-width="2.4"/>')
    p.append("</g>")
    return "".join(p)


def palm(x, y, h, lean, color, size=1.0, trunk=None, outline=False):
    """Return a palm tree whose trunk rises from (x, y) by h, leaning by lean."""
    tx, ty = x + lean, y - h
    st = f' stroke="{INK}" stroke-width="1.6"' if outline else ""
    d = (f"M {n(x - 7 * size)} {y} Q {n(x - 5 * size + lean * 0.5)} {n(y - h * 0.55)} {n(tx - 3 * size)} {n(ty)} "
         f"L {n(tx + 3 * size)} {n(ty)} Q {n(x + 5 * size + lean * 0.5)} {n(y - h * 0.55)} {n(x + 7 * size)} {y} Z")
    out = [f'<path d="{d}" fill="{trunk or color}"{st}/>']
    for ang, length, droop in [(-165, 70, 24), (-135, 62, 12), (-105, 50, 4), (-75, 52, 6),
                               (-45, 64, 14), (-15, 70, 26), (15, 58, 30), (165, 58, 30)]:
        a = math.radians(ang)
        ln = length * size
        tip = (tx + ln * math.cos(a), ty + ln * math.sin(a) + droop * size)
        mid = (tx + ln * 0.5 * math.cos(a), ty + ln * 0.5 * math.sin(a) - 6 * size)
        dx, dy = tip[0] - tx, tip[1] - ty
        dd = math.hypot(dx, dy) or 1
        px, py = -dy / dd, dx / dd
        w = 9 * size
        up = (mid[0] + px * w, mid[1] + py * w)
        lo = (mid[0] - px * w * 0.5, mid[1] - py * w * 0.5)
        out.append(f'<path d="M {n(tx)} {n(ty)} Q {n(up[0])} {n(up[1])} {n(tip[0])} {n(tip[1])} '
                   f'Q {n(lo[0])} {n(lo[1])} {n(tx)} {n(ty)} Z" fill="{color}"{st}/>')
    out.append(f'<circle cx="{n(tx)}" cy="{n(ty)}" r="{n(6 * size)}" fill="{trunk or color}"/>')
    return "".join(out)


def striped_sun(sid, cx, cy, r, top, bottom):
    """Return a retro sun whose lower half is cut by widening bands."""
    fill = vgrad(sid + "g", [(0, top), (1, bottom)])
    bands, y, gap, step = [], cy + r * 0.08, r * 0.05, r * 0.16
    while y < cy + r:
        bands.append(f'<rect x="{n(cx - r - 2)}" y="{n(y)}" width="{n(2 * r + 4)}" height="{n(gap)}" fill="black"/>')
        y, gap, step = y + step, gap * 1.35, step * 1.12
    DEFS.append(f'<mask id="{sid}" maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="630">'
                f'<rect width="1200" height="630" fill="white"/>{"".join(bands)}</mask>')
    return f'<circle cx="{n(cx)}" cy="{n(cy)}" r="{n(r)}" fill="{fill}" mask="url(#{sid})"/>'


def split_gate(cx, base, w, h, gap, color):
    """Return a Balinese split gate: two stepped halves with a straight cut between."""
    out = []
    for side in (-1, 1):
        inner = cx + side * gap / 2
        y, pts = base, [(inner, base)]
        for frac, hh in zip([1, .86, .72, .58, .44, .30, .16], [.18, .16, .15, .14, .13, .12, .12]):
            outer = inner + side * w * frac
            pts += [(outer, y), (outer, y - h * hh)]
            y -= h * hh
        pts.append((inner, y))
        out.append('<polygon points="' + " ".join(f"{n(a)},{n(b)}" for a, b in pts) + f'" fill="{color}"/>')
        out.append(f'<path d="M {n(inner + side * 2)} {n(y)} L {n(inner + side * 3)} {n(y - 7)}" stroke="{color}" stroke-width="2"/>')
    return "".join(out)


def stupa(x, y, r, color):
    """Return a bell-shaped stupa standing on y."""
    return (f'<path d="M {n(x - r)} {n(y)} C {n(x - r)} {n(y - r * 1.25)} {n(x + r)} {n(y - r * 1.25)} {n(x + r)} {n(y)} Z" fill="{color}"/>'
            f'<rect x="{n(x - r * 0.22)}" y="{n(y - r * 1.2)}" width="{n(r * 0.44)}" height="{n(r * 0.3)}" fill="{color}"/>'
            f'<path d="M {n(x)} {n(y - r * 1.1)} L {n(x)} {n(y - r * 1.9)}" stroke="{color}" stroke-width="{n(max(1.2, r * 0.16))}" stroke-linecap="round"/>')


def dancer(x, base, h, color, arms="up", lean=0.0):
    """Return a dancing silhouette and the positions of its hands."""
    hip = (x + lean * 0.3, base - h * 0.45)
    neck = (x + lean, base - h * 0.78)
    head = (x + lean * 1.1, base - h * 0.9)
    if arms == "up":
        hands = [(neck[0] - h * 0.22, neck[1] - h * 0.32), (neck[0] + h * 0.24, neck[1] - h * 0.3)]
    elif arms == "one":
        hands = [(neck[0] - h * 0.26, neck[1] + h * 0.12), (neck[0] + h * 0.16, neck[1] - h * 0.36)]
    else:
        hands = [(neck[0] - h * 0.36, neck[1] - h * 0.02), (neck[0] + h * 0.36, neck[1] - h * 0.04)]
    out = [f'<g stroke="{color}" stroke-linecap="round" fill="none">',
           f'<path d="M {n(hip[0])} {n(hip[1])} L {n(neck[0])} {n(neck[1])}" stroke-width="{n(h * 0.16)}"/>',
           f'<path d="M {n(hip[0])} {n(hip[1])} L {n(x - h * 0.12)} {n(base)} M {n(hip[0])} {n(hip[1])} L {n(x + h * 0.14)} {n(base)}" stroke-width="{n(h * 0.1)}"/>']
    for hx, hy in hands:
        out.append(f'<path d="M {n(neck[0])} {n(neck[1] + h * 0.03)} L {n(hx)} {n(hy)}" stroke-width="{n(h * 0.065)}"/>')
    out.append("</g>")
    out.append(f'<circle cx="{n(head[0])}" cy="{n(head[1])}" r="{n(h * 0.085)}" fill="{color}"/>')
    return "".join(out), hands


def singapore(base, color):
    """Return a Singapore skyline: the Flyer, Marina Bay Sands and towers."""
    p = []
    cx, cy, r = 902, 162, 27
    p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{color}" stroke-width="3"/>')
    for k in range(12):
        a = math.pi * 2 * k / 12
        p.append(f'<path d="M {cx} {cy} L {n(cx + r * math.cos(a))} {n(cy + r * math.sin(a))}" stroke="{color}" stroke-width="1"/>')
    p.append(f'<path d="M {cx - 16} {base} L {cx} {cy} L {cx + 16} {base}" stroke="{color}" stroke-width="3" fill="none"/>')
    p.append(f'<rect x="850" y="{base - 10}" width="44" height="10" fill="{color}"/>')
    for k in range(5):
        a = math.radians(-150 + k * 30)
        p.append(f'<path d="M 955 {base} Q {n(955 + 14 * math.cos(a) - 4)} {n(base + 14 * math.sin(a))} '
                 f'{n(955 + 16 * math.cos(a))} {n(base - 2 + 16 * math.sin(a))} Z" fill="{color}" stroke="{color}" stroke-width="3"/>')
    for tx in (990, 1018, 1046):
        p.append(f'<polygon points="{tx - 9},{base} {tx - 6},{base - 64} {tx + 6},{base - 64} {tx + 9},{base}" fill="{color}"/>')
    sy = base - 66
    p.append(f'<path d="M 975 {sy + 2} Q 1000 {sy - 4} 1050 {sy - 3} L 1082 {sy - 4} L 1084 {sy} L 1064 {sy + 4} L 980 {sy + 5} Z" fill="{color}"/>')
    for tx, tw, th in [(1072, 12, 48), (1088, 16, 76), (1108, 12, 58), (1124, 18, 92),
                       (1146, 14, 66), (1164, 20, 84), (1186, 14, 52)]:
        p.append(f'<rect x="{tx}" y="{base - th}" width="{tw}" height="{th}" fill="{color}"/>')
        for _ in range(int(th / 8)):
            wx, wy = rng.uniform(tx + 2, tx + tw - 3), rng.uniform(base - th + 4, base - 4)
            p.append(f'<rect x="{n(wx)}" y="{n(wy)}" width="1.8" height="1.8" fill="#FFD36E" opacity="0.85"/>')
    return "".join(p)


def cloud(cx, cy, s):
    """Return a small white cloud."""
    parts = [(0, 0, 34, 12), (-20, -6, 18, 12), (6, -12, 20, 15), (24, -4, 16, 10)]
    return '<g fill="#FFFFFF">' + "".join(
        f'<ellipse cx="{n(cx + dx * s)}" cy="{n(cy + dy * s)}" rx="{n(rx * s)}" ry="{n(ry * s)}"/>'
        for dx, dy, rx, ry in parts) + "</g>"


def jukung(x, y):
    """Return a Balinese outrigger boat with a striped sail, hull on y."""
    return (f'<path d="M {x - 44} {y - 10} L {x + 40} {y - 10}" stroke="#6B4A2B" stroke-width="2.2" stroke-linecap="round"/>'
            f'<path d="M {x - 52} {y - 2} L {x + 50} {y - 2} L {x + 64} {y - 14} L {x + 58} {y + 2} '
            f'Q {x + 10} {y + 18} {x - 46} {y + 6} Z" fill="#FFF6EA" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M {x - 48} {y + 2} L {x + 54} {y + 2}" stroke="#E63946" stroke-width="2.4"/>'
            f'<path d="M {x - 44} {y + 6} Q {x + 8} {y + 13} {x + 52} {y + 5}" stroke="#1D6FD1" stroke-width="2" fill="none"/>'
            f'<circle cx="{x + 52}" cy="{y - 4}" r="2.2" fill="{INK}"/>'
            f'<path d="M {x - 50} {y + 14} L {x + 46} {y + 14}" stroke="#6B4A2B" stroke-width="2.2" stroke-linecap="round"/>'
            f'<path d="M {x - 24} {y - 10} Q {x - 30} {y + 2} {x - 24} {y + 14} M {x + 24} {y - 10} Q {x + 18} {y + 2} {x + 24} {y + 14}" '
            f'stroke="#6B4A2B" stroke-width="2" fill="none"/>'
            f'<path d="M {x} {y - 2} L {x} {y - 62}" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M {x + 2} {y - 60} L {x + 2} {y - 6} L {x - 40} {y - 14} Z" fill="#FFC93C" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M {x + 2} {y - 44} L {x - 28} {y - 12} L {x - 14} {y - 10} L {x + 2} {y - 26} Z" fill="#E63946"/>')


def umbrella(x, y):
    """Return a striped beach umbrella and a towel."""
    cx, cy = x - 3, y - 34
    return (f'<path d="M {x} {y} L {cx} {cy}" stroke="{INK}" stroke-width="2"/>'
            f'<path d="M {cx - 28} {cy + 6} Q {cx} {cy - 22} {cx + 28} {cy + 6} Z" fill="#E63946" stroke="{INK}" stroke-width="1.6"/>'
            f'<path d="M {cx} {cy - 8} L {cx - 16} {cy + 6} L {cx - 6} {cy + 6} Z M {cx} {cy - 8} L {cx + 6} {cy + 6} L {cx + 16} {cy + 6} Z" fill="#FFFFFF"/>'
            f'<path d="M {x + 6} {y + 4} L {x + 40} {y + 2} L {x + 46} {y + 8} L {x + 12} {y + 10} Z" fill="#3DB5E6" stroke="{INK}" stroke-width="1.3"/>')


def surfboard(x, base, ang):
    """Return a surfboard standing on its tail, tilted by ang degrees."""
    cy = base - 84
    return (f'<g transform="rotate({ang} {x} {base})">'
            f'<ellipse cx="{x}" cy="{cy}" rx="13" ry="84" fill="#FFF6EA" stroke="{INK}" stroke-width="2.2"/>'
            f'<path d="M {x} {cy - 80} L {x} {cy + 80}" stroke="#E63946" stroke-width="2.4"/>'
            f'<path d="M {x - 12} {cy + 20} L {x + 12} {cy + 20} M {x - 11.5} {cy + 30} L {x + 11.5} {cy + 30}" stroke="#17B3A3" stroke-width="4"/>'
            "</g>")


def panel_a():
    """Bali at sunset: split gate on the headland, the hero on the sand."""
    p = [clip("cA", 8, 8, 344, 614)]
    p.append(f'<rect x="8" y="8" width="344" height="420" fill="{vgrad("skyA", [(0, "#241446"), (0.35, "#7A2A6E"), (0.62, "#E2475E"), (0.82, "#FF8C4A"), (1, "#FFC163")])}"/>')
    p.append(striped_sun("sunA", 262, 400, 66, "#FFE88A", "#FF8F4A"))
    p.append('<path d="M 8 440 L 8 366 C 30 356 58 354 80 364 C 98 372 110 392 124 412 L 124 440 Z" fill="#2B1638"/>')
    p.append(split_gate(50, 362, 22, 70, 6, "#2B1638"))
    p.append(f'<rect x="8" y="412" width="344" height="112" fill="{vgrad("seaA", [(0, "#5A2C72"), (1, "#1E6F8C")])}"/>')
    for i, (yy, ww) in enumerate([(418, 120), (426, 96), (435, 78), (446, 60), (459, 44), (474, 30), (490, 18)]):
        p.append(f'<rect x="{n(262 - ww / 2)}" y="{yy}" width="{ww}" height="3" rx="1.5" fill="#FFD36E" opacity="{n(0.9 - i * 0.1)}"/>')
    p.append(f'<path d="M 8 520 C 120 510 240 530 352 514 L 352 622 L 8 622 Z" fill="{vgrad("sandA", [(0, "#E8A86B"), (1, "#C27C4C")])}"/>')
    p.append('<path d="M 8 519 C 120 509 240 529 352 513" stroke="#FFF3E0" stroke-width="3" fill="none" opacity="0.85"/>')
    p.append(palm(332, 604, 330, -72, "#1A0D24", 1.25))
    p.append(palm(18, 612, 160, 22, "#1A0D24", 0.85))
    p.append(woman(HERO, 186, 606 - 398 * 1.3, 1.3, pose="glasses"))
    star = "M 0 -9 L 2.6 -2.8 L 9 -2.8 L 3.9 1.2 L 5.8 7.6 L 0 3.8 L -5.8 7.6 L -3.9 1.2 L -9 -2.8 L -2.6 -2.8 Z"
    p.append("".join(f'<path d="{star}" transform="translate({254 + k * 21} 30)" fill="#FFFFFF" stroke="{INK}" stroke-width="2.4" '
                     f'stroke-linejoin="round" paint-order="stroke"/>' for k in range(5)))
    p.append("</g>")
    return "".join(p)


def panel_b():
    """The title on a striped sunset between two palms."""
    p = [clip("cB", 360, 8, 480, 206)]
    p.append(f'<rect x="360" y="8" width="480" height="206" fill="{vgrad("skyB", [(0, "#FFB347"), (0.55, "#FF5E62"), (1, "#7B2C77")])}"/>')
    p.append(striped_sun("sunB", 600, 214, 150, "#FFE88A", "#FF5E62"))
    p.append(palm(384, 232, 170, 24, "#3A1240", 1.05))
    p.append(palm(818, 232, 185, -30, "#3A1240", 1.1))
    font = "Impact, 'Arial Black', sans-serif"
    p.append(f'<g transform="rotate(-3 600 100)">'
             f'<text x="607" y="139" font-family="{font}" font-size="124" letter-spacing="3" text-anchor="middle" '
             f'fill="{INK}" stroke="{INK}" stroke-width="9" stroke-linejoin="round">TRAVEL</text>'
             f'<text x="600" y="132" font-family="{font}" font-size="124" letter-spacing="3" text-anchor="middle" '
             f'fill="#FFFFFF" stroke="{INK}" stroke-width="9" stroke-linejoin="round" paint-order="stroke">TRAVEL</text></g>')
    p.append('<g transform="rotate(-6 650 186)" filter="url(#neon)">'
             '<text x="650" y="196" font-family="\'Snell Roundhand\', \'Brush Script MT\', cursive" font-weight="bold" '
             'font-size="56" text-anchor="middle" fill="#FFE3F4" stroke="#FF3CAC" stroke-width="2.4" paint-order="stroke">Indonesia</text></g>')
    p.append("</g>")
    return "".join(p)


def panel_c():
    """A full moon party on the beach, the Singapore skyline across the water."""
    p = [clip("cC", 848, 8, 344, 292)]
    p.append(f'<rect x="848" y="8" width="344" height="200" fill="{vgrad("skyC", [(0, "#090820"), (0.6, "#1D1350"), (1, "#40206F")])}"/>')
    for _ in range(46):
        p.append(f'<circle cx="{n(rng.uniform(850, 1190))}" cy="{n(rng.uniform(10, 150))}" r="{n(rng.uniform(0.5, 1.4))}" '
                 f'fill="#FFFFFF" opacity="{n(rng.uniform(0.4, 0.9))}"/>')
    DEFS.append('<radialGradient id="moonGlow"><stop offset="0" stop-color="#FFF4D0" stop-opacity="0.55"/>'
                '<stop offset="1" stop-color="#FFF4D0" stop-opacity="0"/></radialGradient>')
    p.append('<circle cx="1112" cy="70" r="96" fill="url(#moonGlow)"/>')
    p.append(f'<circle cx="1112" cy="70" r="42" fill="#FFF6DC" stroke="{INK}" stroke-width="2"/>')
    for cx, cy, r in [(1100, 58, 9), (1124, 80, 7), (1098, 86, 5), (1126, 56, 4), (1112, 72, 3)]:
        p.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#E9DDB8" opacity="0.8"/>')
    p.append('<g transform="rotate(-5 900 60)" filter="url(#neon)">'
             '<text x="864" y="66" font-family="\'Snell Roundhand\', cursive" font-weight="bold" font-size="40" '
             'fill="#FFE6FB" stroke="#FF4FD8" stroke-width="2" paint-order="stroke">Full Moon</text></g>')
    p.append('<g filter="url(#neon)"><text x="868" y="114" font-family="Impact, sans-serif" font-size="40" letter-spacing="7" '
             'fill="#E9FFFF" stroke="#3DF5FF" stroke-width="2" paint-order="stroke">PARTY</text></g>')
    p.append(singapore(198, "#120A2B"))
    p.append('<rect x="848" y="198" width="344" height="40" fill="#160E38"/>')
    for i, yy in enumerate(range(202, 234, 5)):
        ww = 40 - i * 5
        p.append(f'<rect x="{n(1112 - ww / 2)}" y="{yy}" width="{ww}" height="2" fill="#FFF6DC" opacity="{n(0.8 - i * 0.1)}"/>')
    p.append('<path d="M 848 238 C 960 230 1080 242 1192 232 L 1192 300 L 848 300 Z" fill="#2C2045"/>')
    DEFS.append('<radialGradient id="fireGlow"><stop offset="0" stop-color="#FF9A3C" stop-opacity="0.65"/>'
                '<stop offset="1" stop-color="#FF9A3C" stop-opacity="0"/></radialGradient>')
    p.append('<ellipse cx="1006" cy="282" rx="96" ry="40" fill="url(#fireGlow)"/>')
    pts = []
    for i in range(17):
        t = i / 16
        pts.append((848 + 344 * t, 222 - 6 * t + 14 * 4 * t * (1 - t)))
    p.append('<path d="M ' + " L ".join(f"{n(a)} {n(b)}" for a, b in pts) + '" stroke="#05030F" stroke-width="1.2" fill="none"/>')
    p.append('<g filter="url(#glow)">' + "".join(
        f'<circle cx="{n(a)}" cy="{n(b + 3)}" r="2.6" fill="{NEON[i % 4]}"/>' for i, (a, b) in enumerate(pts[1:-1])) + "</g>")
    crowd = [(866, 50, "up", -3), (902, 57, "one", 2), (944, 52, "up", -2), (1062, 55, "up", 3),
             (1100, 50, "one", -2), (1140, 57, "up", 2), (1178, 47, "up", -1)]
    for i, (dx, hh, arms, lean) in enumerate(crowd):
        s, hands = dancer(dx, 298, hh, "#07041A", arms, lean)
        p.append(s)
        p.append('<g filter="url(#glow)">' + "".join(
            f'<circle cx="{n(a)}" cy="{n(b)}" r="2.3" fill="{NEON[(i + j) % 4]}"/>' for j, (a, b) in enumerate(hands)) + "</g>")
    s, hands = dancer(1004, 298, 60, "#07041A", "out", 0)
    rings = "".join(f'<circle cx="{n(a)}" cy="{n(b)}" r="17" fill="none" stroke="#FF9A2E" stroke-width="3"/>'
                    f'<circle cx="{n(a)}" cy="{n(b)}" r="17" fill="none" stroke="#FFF1A8" stroke-width="1.1"/>' for a, b in hands)
    p.append(f'<g filter="url(#glow)">{rings}</g>')
    p.append(s)
    p.append("</g>")
    return "".join(p)


CLUB = dict(skin="#B47A52", shade="#94603C", hair="#1E120B", hair_hi="#3F271A",
            top="#F2C14E", top_hi="#FFE7A3", bottom="#7B2CBF", bottom_shade="#561F8A", lip="#9E1F3A")


def meru(x, base, w, h, color, tiers=5):
    """Return a Balinese meru: a shrine tower with stacked, shrinking roofs."""
    p = [f'<rect x="{n(x - w * 0.06)}" y="{n(base - h)}" width="{n(w * 0.12)}" height="{n(h)}" fill="{color}"/>',
         f'<rect x="{n(x - w * 0.18)}" y="{n(base - h * 0.28)}" width="{n(w * 0.36)}" height="{n(h * 0.28)}" fill="{color}"/>']
    y, th = base - h * 0.28, h * 0.72 / tiers
    for k in range(tiers):
        ww = w * (1 - k * 0.16)
        p.append(f'<polygon points="{n(x - ww / 2)},{n(y)} {n(x + ww / 2)},{n(y)} {n(x + ww * 0.3)},{n(y - th * 0.8)} '
                 f'{n(x - ww * 0.3)},{n(y - th * 0.8)}" fill="{color}"/>')
        y -= th
    return "".join(p)


def sparkler_bottle(x, base):
    """Return a bottle with a lit sparkler, standing on base."""
    rays = "".join(f'<path d="M {x} {base - 44} l {n(10 * math.cos(math.radians(a)))} {n(10 * math.sin(math.radians(a)))}" '
                   f'stroke="#FFF1A8" stroke-width="1.2"/>' for a in range(0, 360, 30))
    return (f'<path d="M {x - 5} {base} L {x - 5} {base - 18} Q {x - 5} {base - 24} {x - 2} {base - 26} L {x - 2} {base - 34} '
            f'L {x + 2} {base - 34} L {x + 2} {base - 26} Q {x + 5} {base - 24} {x + 5} {base - 18} L {x + 5} {base} Z" '
            f'fill="#1F4D2E" stroke="{INK}" stroke-width="1.4"/>'
            f'<path d="M {x} {base - 34} L {x} {base - 42}" stroke="#BBBBBB" stroke-width="1.2"/>'
            f'<g filter="url(#glow)">{rays}<circle cx="{x}" cy="{base - 44}" r="3" fill="#FFF8D6"/></g>')


def panel_d():
    """Sunset at a clifftop pool club in Uluwatu, Bali: DJ, lasers, pool."""
    p = [clip("cD", 360, 222, 480, 198)]
    p.append(f'<rect x="360" y="222" width="480" height="118" fill="{vgrad("skyD", [(0, "#2B1650"), (0.5, "#C2417A"), (0.85, "#FF8C4A"), (1, "#FFC163")])}"/>')
    p.append(striped_sun("sunD", 572, 338, 38, "#FFE88A", "#FF8F4A"))
    beams = "".join(f'<path d="M 768 300 L {ex} {ey}" stroke="{["#6CFF5A", "#FF4FD8", "#3DF5FF"][k % 3]}" stroke-width="1.6" opacity="0.75"/>'
                    for k, (ex, ey) in enumerate([(372, 222), (452, 222), (540, 222), (628, 222), (700, 222), (846, 236)]))
    p.append(f'<g filter="url(#glow)">{beams}</g>')
    p.append('<path d="M 360 342 L 360 300 L 378 296 L 396 304 L 412 300 L 426 320 L 432 342 Z" fill="#3A1B40"/>')
    p.append(meru(388, 300, 22, 36, "#3A1B40"))
    p.append(f'<rect x="360" y="338" width="480" height="24" fill="{vgrad("seaD", [(0, "#6A2E6E"), (1, "#2C5E86")])}"/>')
    for i, (yy, ww) in enumerate([(341, 70), (346, 52), (351, 36), (356, 22)]):
        p.append(f'<rect x="{n(572 - ww / 2)}" y="{yy}" width="{ww}" height="2" fill="#FFD36E" opacity="{n(0.8 - i * 0.15)}"/>')
    p.append(f'<rect x="360" y="360" width="480" height="26" fill="{vgrad("poolD", [(0, "#36C9D9"), (1, "#0E7FA3")])}"/>')
    p.append('<path d="M 360 360 L 840 360" stroke="#FFFFFF" stroke-width="1.5" opacity="0.8"/>')
    for _ in range(14):
        wx, wy = rng.uniform(370, 830), rng.uniform(364, 382)
        p.append(f'<path d="M {n(wx)} {n(wy)} q 6 -2 12 0" stroke="#FFB3D9" stroke-width="1.4" fill="none" opacity="0.7"/>')
    p.append(palm(692, 388, 124, -10, "#1A0D24", 0.82))
    p.append(palm(838, 392, 146, -22, "#1A0D24", 0.92))
    p.append('<g filter="url(#neon)"><rect x="716" y="262" width="104" height="98" rx="14" fill="none" stroke="#FF4FD8" stroke-width="3"/>'
             '<rect x="724" y="270" width="88" height="90" rx="10" fill="none" stroke="#3DF5FF" stroke-width="2"/></g>')
    p.append(dancer(768, 340, 56, "#05030F", "up", 0)[0])
    p.append('<path d="M 760 289 Q 768 278 776 289" stroke="#3DF5FF" stroke-width="2.2" fill="none"/>')
    p.append(f'<rect x="726" y="300" width="84" height="60" fill="#120A1E" stroke="{INK}" stroke-width="2"/>')
    p.append('<g filter="url(#glow)"><rect x="734" y="310" width="68" height="4" fill="#FF4FD8"/>'
             '<circle cx="748" cy="330" r="7" fill="none" stroke="#3DF5FF" stroke-width="1.6"/>'
             '<circle cx="788" cy="330" r="7" fill="none" stroke="#3DF5FF" stroke-width="1.6"/></g>')
    p.append('<g filter="url(#neon)"><text x="768" y="254" font-family="Impact, sans-serif" font-size="24" letter-spacing="4" '
             'text-anchor="middle" fill="#E9FFFF" stroke="#3DF5FF" stroke-width="1.6" paint-order="stroke">ULUWATU</text></g>')
    p.append('<rect x="360" y="386" width="480" height="34" fill="#3A2418"/>')
    p.append(f'<path d="M 360 386 L 840 386" stroke="{INK}" stroke-width="2.5"/>')
    for yy in (394, 403, 412):
        p.append(f'<path d="M 360 {yy} L 840 {yy}" stroke="#2A190F" stroke-width="1.2"/>')
    for i, (dx, hh) in enumerate([(640, 38), (676, 42), (712, 36), (826, 40)]):
        s, hands = dancer(dx, 418, hh, "#120A1E", "up" if i % 2 == 0 else "one", (-2, 2)[i % 2])
        p.append(s)
        p.append('<g filter="url(#glow)">' + "".join(
            f'<circle cx="{n(a)}" cy="{n(b)}" r="2" fill="{NEON[(i + j) % 4]}"/>' for j, (a, b) in enumerate(hands)) + "</g>")
    p.append(sparkler_bottle(536, 414))
    p.append(woman(CLUB, 470, 418 - 398 * 0.42, 0.42, pose="glasses"))
    p.append("</g>")
    return "".join(p)


def panel_e():
    """Borobudur at dawn with Merapi smoking behind it."""
    p = [clip("cE", 360, 428, 236, 194)]
    p.append(f'<rect x="360" y="428" width="236" height="194" fill="{vgrad("skyE", [(0, "#3D2A6B"), (0.55, "#D9707A"), (1, "#FFC27A")])}"/>')
    p.append('<path d="M 372 566 C 416 544 468 500 496 488 L 512 488 C 540 502 582 540 604 560 L 604 566 Z" fill="#74507F"/>')
    smoke = "".join(f'<circle cx="{cx}" cy="{cy}" r="{r}"/>' for cx, cy, r in
                    [(505, 482, 6), (510, 474, 8), (518, 467, 10), (530, 462, 11), (544, 459, 12), (560, 458, 11), (576, 460, 9)])
    p.append(f'<g fill="#D9CDE0" opacity="0.7" filter="url(#soft)">{smoke}</g>')
    col = "#2B1A3A"
    for tx, ty, tw, th in [(388, 580, 180, 18), (400, 566, 156, 14), (412, 554, 132, 12), (424, 544, 108, 10),
                           (434, 536, 88, 8), (440, 528, 76, 8), (452, 519, 52, 9), (466, 512, 24, 7)]:
        p.append(f'<rect x="{tx}" y="{ty}" width="{tw}" height="{th}" fill="{col}"/>')
    for k in range(6):
        p.append(stupa(442 + k * 14.4, 536, 5.4, col))
    for k in range(5):
        p.append(stupa(449 + k * 14.5, 528, 5.8, col))
    for k in range(3):
        p.append(stupa(462 + k * 16, 519, 6.2, col))
    p.append(stupa(478, 512, 13, col))
    p.append('<ellipse cx="430" cy="600" rx="90" ry="7" fill="#FFFFFF" opacity="0.22"/>'
             '<ellipse cx="548" cy="606" rx="70" ry="6" fill="#FFFFFF" opacity="0.2"/>')
    p.append('<path d="M 360 622 L 360 606 Q 372 596 384 606 Q 396 592 410 604 Q 422 598 432 608 Q 448 600 462 610 '
             'Q 480 602 494 610 Q 512 600 526 608 Q 544 598 558 606 Q 576 596 596 604 L 596 622 Z" fill="#1A2C22"/>')
    p.append(palm(372, 624, 84, 10, "#1A2C22", 0.62))
    p.append(palm(588, 624, 92, -12, "#1A2C22", 0.66))
    p.append("</g>")
    return "".join(p)


def panel_f():
    """A close-up: lowering the sunglasses against a hot sunset."""
    p = [clip("cF", 604, 428, 236, 194)]
    p.append(f'<rect x="604" y="428" width="236" height="194" fill="{vgrad("skyF", [(0, "#FF3CAC"), (0.6, "#FF7A59"), (1, "#FFC163")], 1, 1)}"/>')
    p.append(f'<g opacity="0.22">{palm(612, 660, 200, 40, "#4A0B3A", 1.7)}</g>')
    p.append(woman(PORTRAIT, 716, 468, 2.0, pose="glasses"))
    p.append("</g>")
    return "".join(p)


def panel_g():
    """Two friends and a surfboard on the beach at sunset."""
    p = [clip("cG", 848, 308, 344, 314)]
    p.append(f'<rect x="848" y="308" width="344" height="180" fill="{vgrad("skyG", [(0, "#4B2A7B"), (0.45, "#E2475E"), (0.8, "#FF9A4D"), (1, "#FFC163")])}"/>')
    p.append(striped_sun("sunG", 1112, 474, 46, "#FFE88A", "#FF8F4A"))
    p.append(f'<rect x="848" y="482" width="344" height="58" fill="{vgrad("seaG", [(0, "#5A2C72"), (1, "#1E6F8C")])}"/>')
    for i, (yy, ww) in enumerate([(487, 80), (494, 62), (502, 46), (511, 32), (521, 20)]):
        p.append(f'<rect x="{n(1112 - ww / 2)}" y="{yy}" width="{ww}" height="2.6" rx="1.3" fill="#FFD36E" opacity="{n(0.85 - i * 0.12)}"/>')
    p.append(f'<path d="M 848 540 C 960 530 1080 546 1192 534 L 1192 622 L 848 622 Z" fill="{vgrad("sandG", [(0, "#E8A86B"), (1, "#C27C4C")])}"/>')
    p.append('<path d="M 848 539 C 960 529 1080 545 1192 533" stroke="#FFF3E0" stroke-width="2.6" fill="none" opacity="0.8"/>')
    p.append(palm(862, 612, 250, 46, "#1A0D24", 1.05))
    p.append(palm(1188, 616, 260, -30, "#1A0D24", 1.05))
    p.append(surfboard(1160, 612, -10))
    p.append(woman(G1, 958, 612 - 398 * 0.66, 0.66, pose="relaxed"))
    p.append(woman(G2, 1066, 612 - 398 * 0.68, 0.68, flip=True, pose="glasses"))
    p.append("</g>")
    return "".join(p)


def frame():
    """Return the black gutters and an ink line around every panel."""
    holes = "".join(f"M {x} {y} h {w} v {h} h {-w} Z " for x, y, w, h in PANELS)
    return (f'<path d="M 0 0 H 1200 V 630 H 0 Z {holes}" fill="#0E0E0E" fill-rule="evenodd"/>'
            + "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="none" stroke="#000" stroke-width="2.5"/>'
                      for x, y, w, h in PANELS))


def main(out):
    """Write the cover SVG to `out`."""
    body = "".join([panel_a(), panel_b(), panel_c(), panel_d(), panel_e(), panel_f(), panel_g()])
    DEFS.extend([
        '<linearGradient id="lens" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8A5B"/>'
        '<stop offset="0.45" stop-color="#8A2D63"/><stop offset="1" stop-color="#140C24"/></linearGradient>',
        '<filter id="neon" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3" result="b"/>'
        '<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
        '<filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2" result="b"/>'
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>',
        '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>',
        '<pattern id="dots" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1" fill="#000"/></pattern>',
        '<filter id="grain" filterUnits="userSpaceOnUse" x="0" y="0" width="1200" height="630">'
        '<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" stitchTiles="stitch"/>'
        '<feColorMatrix type="saturate" values="0"/></filter>',
    ])
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">'
           f'<defs>{"".join(DEFS)}</defs><rect width="1200" height="630" fill="#0E0E0E"/>{body}'
           '<rect width="1200" height="630" fill="url(#dots)" opacity="0.06"/>'
           '<rect width="1200" height="630" filter="url(#grain)" opacity="0.12" style="mix-blend-mode:multiply"/>'
           f'{frame()}</svg>')
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(svg)


if __name__ == "__main__":
    main(sys.argv[1])
