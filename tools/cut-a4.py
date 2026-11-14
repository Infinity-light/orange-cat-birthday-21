"""第四幕分层：把长椅上的那片叶子从微缩小镇底图里切出来（要能被拖开），底图上叶子的位置补成长椅。
python tools/cut-a4.py → app/assets/scene/a4-map.webp（已补）、a4-leaf.webp，layers/a4/*.png"""
import numpy as np, cv2
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
SC = ROOT / 'app' / 'assets' / 'scene'; LAY = ROOT / 'layers' / 'a4'; LAY.mkdir(parents=True, exist_ok=True)
im = np.asarray(Image.open(ROOT / 'gen' / 'a4-map.png').convert('RGB')).astype(np.float32) / 255
H, W = im.shape[:2]; K = W / 760
x0, y0, x1, y1 = [int(v * K) for v in (332, 482, 428, 556)]          # 叶子所在的范围（世界坐标 → 像素）
sub = im[y0:y1, x0:x1]
leaf = np.zeros(sub.shape[:2], np.uint8)
cv2.ellipse(leaf, (int((381 - 332) * K), int((518 - 482) * K)), (int(32 * K), int(23 * K)), -8, 0, 360, 1, -1)   # 叶子：手工给的椭圆（颜色阈值会漏掉被暖光照黄的那半片）
alpha = cv2.GaussianBlur(leaf.astype(np.float32), (0, 0), 1.2)
spr = np.dstack([sub, alpha])
ys, xs = np.where(leaf > 0); bx0, bx1, by0, by1 = max(0, xs.min() - 4), min(sub.shape[1], xs.max() + 5), max(0, ys.min() - 4), min(sub.shape[0], ys.max() + 5)
out = Image.fromarray((np.clip(spr[by0:by1, bx0:bx1], 0, 1) * 255).astype(np.uint8), 'RGBA')
out.save(LAY / 'a4-leaf.png'); out.save(SC / 'a4-leaf.webp', quality=92, method=6)
print('leaf world box', [(x0 + bx0) / K, (y0 + by0) / K, (bx1 - bx0) / K, (by1 - by0) / K])
# 底图：叶子的位置补成长椅
mask = np.zeros((H, W), np.uint8); mask[y0:y1, x0:x1] = cv2.dilate(leaf, np.ones((11, 11), np.uint8)) * 255
# 长椅的木条是横向的：每一行用叶子左右两侧的颜色横向过渡补上（比通用的修补算法更像木条）
fx = (im * 255).astype(np.uint8).copy().astype(np.float32)
for yy in range(y0, y1):
    xs_ = np.where(mask[yy] > 0)[0]
    if not len(xs_): continue
    l, r_ = xs_.min() - 2, xs_.max() + 2
    cl = fx[yy, l - 4:l].mean(axis=0); cr = fx[yy, r_:r_ + 4].mean(axis=0)
    t = np.linspace(0, 1, r_ - l)[:, None]
    fx[yy, l:r_] = cl * (1 - t) + cr * t + np.random.default_rng(yy).normal(0, 2.2, (r_ - l, 3))
blur = cv2.GaussianBlur(fx, (0, 0), 0.8); m3 = (cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 2))[..., None]
fixed = np.clip(fx * (1 - m3) + blur * m3, 0, 255).astype(np.uint8)
Image.fromarray(fixed).save(LAY / 'a4-map-noleaf.png'); Image.fromarray(fixed).save(SC / 'a4-map.webp', quality=88, method=6)
Image.fromarray(fixed[y0 - 40:y1 + 40, x0 - 60:x1 + 60]).save(ROOT / 'work' / '_a4-noleaf.png')
