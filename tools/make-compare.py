"""交付用的对比图：python -X utf8 tools/make-compare.py
→ style/00-定调对比-现有截图与Codex影视级.png、compare/第N幕-新旧对比.png、compare/总览-新旧对比.png"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import re
ROOT = Path(__file__).resolve().parent.parent
F = lambda s: ImageFont.truetype('C:/Windows/Fonts/msyh.ttc', s)
BG, FG, SUB = (18, 20, 18), (240, 232, 214), (160, 156, 144)
def fit(im, h): return im.convert('RGB').resize((round(im.width * h / im.height), h), Image.LANCZOS)
def row(items, h, title, pad=24):
    ims = [(fit(Image.open(p), h), t) for p, t in items]
    w = sum(i.width for i, _ in ims) + pad * (len(ims) + 1)
    out = Image.new('RGB', (w, h + 60 + 44 + pad), BG); d = ImageDraw.Draw(out)
    d.text((pad, 14), title, font=F(26), fill=FG); x = pad
    for im, t in ims:
        out.paste(im, (x, 60)); d.text((x, 60 + h + 8), t, font=F(18), fill=SUB); x += im.width + pad
    return out
def stack(rows, pad=0):
    w = max(r.width for r in rows); out = Image.new('RGB', (w, sum(r.height for r in rows)), BG); y = 0
    for r in rows: out.paste(r, (0, y)); y += r.height
    return out
S = ROOT / 'style'
row([(S / '01-现有版本截图-第一幕探头.png', '现有版本的一张截图（第一幕：小猫从礼物里探头）'), (S / '02-影视级定调图-Codex生成.png', 'Codex 以左图为参考生成的影视级定调图')], 1200, '风格定调：左 = 现有版本截图，右 = Codex 生成的影视级版本').save(S / '00-定调对比-现有截图与Codex影视级.png')
C = ROOT / 'shots' / 'cmp'; O = ROOT / 'compare'; O.mkdir(exist_ok=True)
NAMES = ['拆礼物', '小猫照相馆', '一年的胶卷', '小镇地图', '生日好运小卖部', '写给你的话', '生日房间']
allrows = []
for a in range(1, 8):
    keys = sorted({re.match(r'new-(\d\w)-(.+)\.png', p.name).groups() for p in C.glob(f'new-{a}?-*.png')})
    r1 = row([(C / f'old-{k}-{n}.png', n) for k, n in keys], 760, f'第{a}幕 {NAMES[a-1]} · 旧版（xiaojumao.godpenai.com）')
    r2 = row([(C / f'new-{k}-{n}.png', n) for k, n in keys], 760, f'第{a}幕 {NAMES[a-1]} · 新版（xiaojumao-film.godpenai.com）')
    s = stack([r1, r2]); s.save(O / f'第{a}幕-新旧对比.png'); allrows.append(s.resize((s.width // 2, s.height // 2), Image.LANCZOS))
stack(allrows).save(O / '总览-新旧对比.png'); print('ok')
