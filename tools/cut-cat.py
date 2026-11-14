"""把小猫侧身图（已抠像）切成骨骼用的分层素材：python tools/cut-cat.py
输入 work/cat-stand-rgba.png（1672x941）→ 输出 app/assets/cat/*.webp + layers/cat/*.png（分层源文件）
每一层都是沿骨骼中线拉直的「条带」：x = 沿骨骼方向（根→梢），y = 垂直骨骼（+y 为行进方向的右手侧）。
"""
import numpy as np, cv2, json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'work' / 'cat-stand-rgba.png'
OUT = ROOT / 'app' / 'assets' / 'cat'; OUT.mkdir(parents=True, exist_ok=True)
LAY = ROOT / 'layers' / 'cat'; LAY.mkdir(parents=True, exist_ok=True)

img = np.asarray(Image.open(SRC)).astype(np.float32) / 255       # H,W,4
H, W = img.shape[:2]


def smooth_path(pts, n):
    """折线 → 等弧长重采样的平滑曲线（Catmull-Rom）"""
    p = np.array(pts, np.float32)
    P = np.vstack([2 * p[0] - p[1], p, 2 * p[-1] - p[-2]])
    out = []
    for i in range(1, len(P) - 2):
        for t in np.linspace(0, 1, 24, endpoint=False):
            a, b, c, d = P[i - 1], P[i], P[i + 1], P[i + 2]
            out.append(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t ** 3))
    out.append(P[-2]); out = np.array(out)
    seg = np.linalg.norm(np.diff(out, axis=0), axis=1); s = np.concatenate([[0], np.cumsum(seg)])
    u = np.linspace(0, s[-1], n)
    return np.stack([np.interp(u, s, out[:, 0]), np.interp(u, s, out[:, 1])], 1), s[-1]


def strip(src, pts, hw, scale=1.0):
    """沿中线 pts 取宽 2*hw 的条带并拉直。返回 RGBA float"""
    _, L = smooth_path(pts, 8)
    n = int(L * scale); m = int(2 * hw * scale)
    c, _ = smooth_path(pts, n)
    t = np.gradient(c, axis=0); t /= np.linalg.norm(t, axis=1, keepdims=True) + 1e-6
    nrm = np.stack([-t[:, 1], t[:, 0]], 1)
    v = np.linspace(-hw, hw, m)
    mx = (c[:, 0][None, :] + nrm[:, 0][None, :] * v[:, None]).astype(np.float32)
    my = (c[:, 1][None, :] + nrm[:, 1][None, :] * v[:, None]).astype(np.float32)
    pm = src.copy(); pm[..., :3] *= pm[..., 3:4]                    # 预乘再采样，边缘不发黑
    o = cv2.remap(pm, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    a = o[..., 3:4]; o[..., :3] = np.where(a > 1e-4, o[..., :3] / np.maximum(a, 1e-4), 0)
    return o


def poly_mask(poly, feather):
    m = np.zeros((H, W), np.uint8); cv2.fillPoly(m, [np.array(poly, np.int32)], 255)
    m = m.astype(np.float32) / 255
    if feather: m = cv2.GaussianBlur(m, (0, 0), feather)
    return m


def fade(o, axis, start, end, invert=False):
    """沿某轴做透明度渐变：start→end 位置 alpha 从 1 → 0（比例 0..1）"""
    n = o.shape[1 - axis] if axis == 0 else o.shape[0]
    n = o.shape[1] if axis == 0 else o.shape[0]
    x = np.linspace(0, 1, n)
    k = np.clip((x - start) / (end - start), 0, 1) if end > start else np.clip((start - x) / (start - end), 0, 1)
    k = 1 - k
    if axis == 0: o[..., 3] *= k[None, :]
    else: o[..., 3] *= k[:, None]
    return o


def save(name, o, q=92, maxw=None):
    a = (np.clip(o, 0, 1) * 255 + 0.5).astype(np.uint8)
    im = Image.fromarray(a, 'RGBA')
    im.save(LAY / f'{name}.png')
    if maxw and im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(OUT / f'{name}.webp', quality=q, method=6)
    return im.size


meta = {}

# ---------- 头 ----------
HEAD_BOX = (985, 25, 1435, 455)
head_poly = [(1022, 300), (1026, 60), (1090, 40), (1400, 40), (1420, 300), (1385, 368), (1335, 398), (1285, 418), (1235, 430), (1180, 432), (1125, 425), (1085, 408), (1050, 385), (1030, 350)]
hm = poly_mask(head_poly, 9)
head = img.copy(); head[..., 3] *= hm
x0, y0, x1, y1 = HEAD_BOX
meta['head'] = {'size': save('head', head[y0:y1, x0:x1], maxw=360), 'box': HEAD_BOX,
                'eyes': [[1142 - x0, 276 - y0, 30, 29], [1262 - x0, 279 - y0, 30, 29]],   # cx, cy, rx, ry（素材像素）
                'center': [1200 - x0, 262 - y0]}

# ---------- 躯干：把头和胡须盖住的地方补成毛 ----------
body = img.copy()
cover = poly_mask([(985, 300), (1000, 250), (1030, 60), (1420, 40), (1440, 320), (1400, 400), (1330, 440), (1290, 470), (1215, 470), (1150, 462), (1090, 470), (1040, 470), (1000, 440), (975, 380)], 0)
bgr = cv2.cvtColor((body[..., :3] * 255).astype(np.uint8), cv2.COLOR_RGB2BGR)
inp = cv2.inpaint(bgr, (cover * 255).astype(np.uint8), 9, cv2.INPAINT_TELEA)
inp = cv2.cvtColor(inp, cv2.COLOR_BGR2RGB).astype(np.float32) / 255
# 补出来的毛太糊：叠一层从旁边干净毛区搬来的高频纹理
patch = body[400:560, 760:980, :3]; hf = patch - cv2.GaussianBlur(patch, (0, 0), 6)
tile = np.tile(hf, (4, 4, 1))[:H, :W]
tex = np.zeros_like(inp); tex[:tile.shape[0], :tile.shape[1]] = tile
tex = np.roll(tex, (300, 990), axis=(0, 1))
cm = cv2.GaussianBlur(cover, (0, 0), 6)[..., None]
body[..., :3] = body[..., :3] * (1 - cm) + np.clip(inp + tex * 0.8, 0, 1) * cm
# 躯干轮廓：前胸/脖子的外形（头原来挡着的地方给一个圆润的胸口）
chest = poly_mask([(930, 345), (985, 335), (1090, 322), (1180, 345), (1245, 400), (1270, 470), (1262, 560), (1200, 650), (930, 690)], 7)
body[..., 3] = np.where(cover > 0.5, np.maximum(chest, img[..., 3] * (1 - cv2.GaussianBlur(poly_mask(head_poly, 0), (0, 0), 3))), img[..., 3])
body[..., 3] = np.where(cover > 0.5, chest, img[..., 3])
torso = strip(body, [(405, 487), (1290, 487)], 185)
tl = torso.shape[1]; th = torso.shape[0]
# 下缘（腿根以下）渐隐
yy = np.linspace(0, 1, th); torso[..., 3] *= np.clip((0.985 - yy) / 0.07, 0, 1)[:, None]
meta['torso'] = {'size': save('torso', torso, maxw=640), 'src': [405, 1290, 302, 672], 'hip': 520, 'chest': 1150, 'spineY': 487}

# ---------- 腿（近侧）：从肩/髋到爪尖的竖条 ----------
def leg(name, pts, hw, top_fade, keep=None):
    src = img.copy()
    if keep: src[..., 3] *= poly_mask(keep, 2.5)
    o = strip(src, pts, hw)
    n = o.shape[1]
    x = np.linspace(0, 1, n)
    o[..., 3] *= np.clip(x / top_fade, 0, 1)[None, :] ** 1.3            # 根部渐隐，融进躯干
    # 根部两侧也收一下，避免带出一整块身体
    v = np.abs(np.linspace(-1, 1, o.shape[0]))[:, None]
    side = np.clip((1 - v) / 0.35, 0, 1)
    k = np.clip(1 - x / (top_fade * 1.6), 0, 1)[None, :]
    o[..., 3] *= side * k + (1 - k)
    meta[name] = {'size': save(name, o, maxw=420)}
    return o

leg('legF', [(1040, 520), (1038, 640), (1034, 760), (1034, 892)], 92, 0.3, [(930, 470), (1135, 470), (1112, 600), (1080, 650), (1077, 800), (1106, 822), (1110, 905), (950, 905), (940, 650)])
leg('legH', [(500, 520), (478, 640), (462, 760), (466, 892)], 100, 0.3, [(370, 470), (650, 470), (605, 600), (562, 640), (547, 700), (542, 905), (385, 905)])

# ---------- 尾巴 ----------
tail = strip(img, [(480, 420), (420, 372), (358, 312), (312, 240), (292, 165), (312, 100), (365, 62), (432, 46), (462, 46)], 74)
n = tail.shape[1]; x = np.linspace(0, 1, n)
tail[..., 3] *= np.clip(x / 0.07, 0, 1)[None, :]
meta['tail'] = {'size': save('tail', tail, maxw=520)}

# ---------- 一条纯毛带（脖子、补缝用） ----------
fur = body[410:520, 640:960].copy()
v = np.abs(np.linspace(-1, 1, fur.shape[0]))[:, None]
fur[..., 3] = np.clip((1 - v) / 0.45, 0, 1) ** 1.2
u = np.linspace(0, 1, fur.shape[1])[None, :]
fur[..., 3] *= np.clip(u / 0.12, 0, 1) * np.clip((1 - u) / 0.12, 0, 1)
meta['fur'] = {'size': save('fur', fur, maxw=256)}

# 眼皮用的毛（额头）
lid = img[150:215, 1150:1250].copy(); lid[..., 3] = 1
meta['lid'] = {'size': save('lid', lid)}

(OUT / 'meta.json').write_text(json.dumps(meta, indent=1), encoding='utf-8')
print(json.dumps(meta))

# 预览
def prev(files, out):
    ims = [Image.open(LAY / f) for f in files]
    w = sum(i.width for i in ims) + 20 * len(ims); h = max(i.height for i in ims) + 20
    bg = Image.new('RGBA', (w, h), (60, 96, 80, 255)); x = 10
    for i in ims: bg.alpha_composite(i, (x, 10)); x += i.width + 20
    bg.convert('RGB').save(ROOT / 'work' / out)
prev(['torso.png', 'head.png'], '_parts1.png'); prev(['legF.png', 'legH.png', 'tail.png', 'fur.png'], '_parts2.png')
