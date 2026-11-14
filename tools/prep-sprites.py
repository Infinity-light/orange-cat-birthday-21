"""整张姿势图：抠像 → 裁到包围盒 → webp。python tools/prep-sprites.py"""
import sys, numpy as np
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent)); from key import key
ROOT = Path(__file__).resolve().parent.parent
for name, src, maxw in [('sit', 'cat-sit', 520), ('sleep', 'cat-sleep', 700)]:
    a = key(ROOT / 'gen' / f'{src}.png'); al = a[..., 3] > 20
    ys, xs = np.where(al); x0, x1, y0, y1 = xs.min() - 6, xs.max() + 7, ys.min() - 6, ys.max() + 7
    im = Image.fromarray(a, 'RGBA').crop((x0, y0, x1, y1)); im.save(ROOT / 'layers' / 'cat' / f'{name}.png')
    print(name, 'bbox', (x0, y0, x1, y1), im.size)
    if im.width > maxw: im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(ROOT / 'app' / 'assets' / 'cat' / f'{name}.webp', quality=92, method=6)
