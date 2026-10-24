"""Render the first ecoutez reel (1080x1920, 30fps) to plate01.mp4.

Usage: python3 plate01.py <fonts_dir>
Fonts: Gloock.ttf, IBMPlexMono.ttf, IBMPlexSansKR.ttf (Google Fonts).
"""
import math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
IMG = os.path.join(HERE, "..", "img")
FONTS = sys.argv[1]
W, H, FPS = 1080, 1920, 30
PAPER, INK, SILVER, SIGNAL = (233, 232, 227), (18, 18, 17), (141, 140, 134), (176, 51, 31)

def font(name, size): return ImageFont.truetype(os.path.join(FONTS, name), size)
DISP = lambda s: font("Gloock.ttf", s)
MONO = lambda s: font("IBMPlexMono.ttf", s)
KR = lambda s: font("IBMPlexSansKR.ttf", s)

def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

rng = np.random.default_rng(7)
GRAIN = [rng.normal(0, 9, (H, W, 1)).astype(np.float32) for _ in range(4)]

def finish(im, i):
    a = np.asarray(im, dtype=np.float32) + GRAIN[i % 4]
    return np.clip(a, 0, 255).astype(np.uint8)

def text(d, xy, s, f, fill, alpha=1.0, anchor="la"):
    if alpha <= 0: return
    c = tuple(int(PAPER[k] + (fill[k] - PAPER[k]) * alpha) for k in range(3))
    d.text(xy, s, font=f, fill=c, anchor=anchor)

# --- scene 1: the locator ---------------------------------------------------
loc = Image.open(os.path.join(IMG, "archive-locator.webp")).convert("L")
PW = 820; PH = round(loc.height * PW / loc.width)
loc = ImageOps.autocontrast(loc.resize((PW, PH), Image.LANCZOS), cutoff=1).convert("RGB")
PX, PY = (W - PW) // 2, 330
HORNS = [(0.15, 0.17), (0.86, 0.76)]

def scene_locator(t, d, im):
    d.rectangle([PX - 14, PY - 14, PX + PW + 13, PY + PH + 13], outline=INK, width=2)
    im.paste(loc, (PX, PY))
    ring = Image.new("RGBA", (PW, PH), (0, 0, 0, 0)); rd = ImageDraw.Draw(ring)
    for hi, (fx, fy) in enumerate(HORNS):
        cx, cy, mx = fx * PW, fy * PH, math.hypot(PW, PH) * .55
        for k in range(5):
            p = (t / 3.2 + k / 5 + hi * .1) % 1
            r = mx * (1 - p) + 6
            a = int(math.sin(p * math.pi) * 200)
            rd.ellipse([cx - r, cy - r, cx + r, cy + r], outline=SIGNAL + (a,), width=3)
    im.paste(ring, (PX, PY), ring)
    text(d, (PX, PY - 60), "PLATE 0 · ACOUSTIC LOCATOR", MONO(26), SILVER)
    y = PY + PH + 70
    for j, line in enumerate(["Before radar,", "you found things", "by listening."]):
        text(d, (PX, y + j * 92), line, DISP(84), INK, ease((t - .8 - j * .35) / .5))

def scene_thesis(t, d, im):
    text(d, (110, 560), "ECOUTEZ — FR. “LISTEN”", MONO(28), SIGNAL, ease(t / .4))
    text(d, (104, 660), "먼저 듣고,", KR(128), INK, ease((t - .2) / .5))
    text(d, (104, 820), "그 다음에", KR(128), INK, ease((t - .6) / .5))
    text(d, (104, 980), "만듭니다.", KR(128), INK, ease((t - 1.0) / .5))
    text(d, (110, 1210), "We listen before we make.", DISP(58), SILVER, ease((t - 1.3) / .5))

# --- scene 3: the work, grey until it is heard ------------------------------
WORKS = [
    ("bonjour-paris/00.webp", "Bonjour! Paris — Robin", "BASKIN-ROBBINS KOREA · 2025", "캐릭터 하나로 한 달을 만들다"),
    ("knotted-store-la/00.webp", "Knotted, Los Angeles", "GFFG · 2024", "복제가 아니라 번역"),
    ("chasinrabbits/00.webp", "Chasin’ Rabbits", "IT’S HANBUL · 2020–22", "무에서 만든 비건 브랜드"),
    ("gffg-graphic-works/00.webp", "Knotted 2025 Campaigns", "GFFG · 2025", "한 줄의 카피에서 출발한 일 년"),
]
FW, FH, FX, FY = 940, 1100, 70, 300
def prep(path):
    im = Image.open(os.path.join(IMG, path)).convert("RGB")
    fh = min(FH, round(FW * im.height / im.width))   # landscape work keeps its full width
    s = max(FW * 1.12 / im.width, fh * 1.12 / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return im, ImageOps.grayscale(im).convert("RGB"), fh
WIMGS = [prep(w[0]) for w in WORKS]
SEG = 1.9

def scene_work(t, d, im):
    i = min(int(t // SEG), len(WORKS) - 1); lt = t - i * SEG
    col, gray, fh = WIMGS[i]
    fy = FY + (FH - fh) // 2
    z = 1.0 - 0.08 * (lt / SEG)                       # slow push-in
    cw, ch = FW / (1.12 * z) * 1.12, fh / (1.12 * z) * 1.12
    cw, ch = min(cw, col.width), min(ch, col.height)
    l, tp = (col.width - cw) / 2, (col.height - ch) / 2
    box = tuple(round(v) for v in (l, tp, l + cw, tp + ch))
    a = ease((lt - .35) / .7)                         # colour returns
    frame = Image.blend(gray.crop(box), col.crop(box), a).resize((FW, fh), Image.LANCZOS)
    im.paste(frame, (FX, fy))
    d.rectangle([FX - 12, fy - 12, FX + FW + 11, fy + fh + 11], outline=INK, width=2)
    text(d, (FX, FY - 58), f"PLATE {i + 1:02d} / 18", MONO(26), SILVER)
    text(d, (FX + FW, FY - 58), "LISTENING", MONO(26), SIGNAL, anchor="ra")
    lx = FX + FW - d.textlength("LISTENING", font=MONO(26)) - 26
    d.ellipse([lx - 8, FY - 47, lx + 8, FY - 31], fill=SIGNAL)
    text(d, (FX, FY + FH + 52), WORKS[i][1], DISP(70), INK, ease(lt / .3))
    text(d, (FX, FY + FH + 146), WORKS[i][3], KR(42), INK, ease((lt - .15) / .3))
    text(d, (FX, FY + FH + 214), WORKS[i][2], MONO(26), SILVER, ease((lt - .25) / .3))

ears = Image.open(os.path.join(IMG, "archive-ears.webp")).convert("RGBA").resize((300, 300), Image.LANCZOS)
def scene_end(t, d, im):
    a = ease(t / .5)
    if a > 0:
        e = ears.copy(); e.putalpha(e.getchannel("A").point(lambda v: int(v * a)))
        g = ImageOps.grayscale(e.convert("RGB")).convert("RGBA"); g.putalpha(e.getchannel("A"))
        im.paste(g, ((W - 300) // 2, 420), g)
    text(d, (W // 2, 1010), "ecoutez", DISP(200), INK, ease((t - .2) / .5), anchor="ma")
    text(d, (W // 2, 1270), "BRAND CREATIVES · SEOUL", MONO(32), SILVER, ease((t - .5) / .5), anchor="ma")
    text(d, (W // 2, 1360), "@ecoutez.official", KR(44), INK, ease((t - .8) / .5), anchor="ma")

SCENES = [(scene_locator, 3.6), (scene_thesis, 2.6), (scene_work, SEG * len(WORKS)), (scene_end, 3.0)]
total = sum(s[1] for s in SCENES)
out = os.path.join(HERE, "plate01.mp4")
ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
    "-r", str(FPS), "-i", "-", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=stereo", "-shortest",
    "-c:v", "libx264", "-preset", "slow", "-crf", "23", "-pix_fmt", "yuv420p", "-profile:v", "high",
    "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
for n in range(int(total * FPS)):
    t = n / FPS; acc = 0
    for fn, dur in SCENES:
        if t < acc + dur or fn is scene_end:
            lt = t - acc; break
        acc += dur
    im = Image.new("RGB", (W, H), PAPER); d = ImageDraw.Draw(im)
    fn(lt, d, im)
    # quick dip between scenes
    edge = min(lt, dur - lt) if fn is not scene_end else lt
    if edge < .12 and n > 0:
        im = Image.blend(Image.new("RGB", (W, H), PAPER), im, edge / .12)
    ff.stdin.write(finish(im, n // 2).tobytes())
ff.stdin.close(); ff.wait()
print(out, total, "s")
