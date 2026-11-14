"""把底图按舞台坐标（390 宽）加网格，方便量位置：python tools/gridview.py key [stageW]"""
import sys
from PIL import Image, ImageDraw
k = sys.argv[1]; SW = float(sys.argv[2]) if len(sys.argv) > 2 else 390
im = Image.open(f'gen/{k}.png').convert('RGB'); Z = 2
W = int(SW * Z); H = round(im.height * W / im.width); im = im.resize((W, H), Image.LANCZOS)
d = ImageDraw.Draw(im, 'RGBA'); SH = H / Z
for x in range(0, int(SW) + 1, 10):
    d.line([(x * Z, 0), (x * Z, H)], fill=(255, 255, 255, 150 if x % 50 == 0 else 40), width=1)
    if x % 50 == 0: d.text((x * Z + 2, 2), str(x), fill=(255, 255, 0, 255))
for yb in range(0, int(SH) + 1, 10):      # 从底边往上量
    y = H - yb * Z
    d.line([(0, y), (W, y)], fill=(255, 255, 255, 150 if yb % 50 == 0 else 40), width=1)
    if yb % 50 == 0: d.text((2, y - 12), f'b{yb}', fill=(0, 255, 255, 255))
im.save(f'work/_grid_{k}.png'); print(im.size, 'stageH', SH)
