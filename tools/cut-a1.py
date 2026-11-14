"""第一幕分层：从定调图里切出探头的小猫（头胸一层、伸出来的爪一层），从空纸包底图里取裂口遮罩。
python tools/cut-a1.py   → app/assets/scene/a1-kitten.webp / a1-paw.webp / a1-hole.png，layers/a1/*.png"""
import numpy as np, cv2
from pathlib import Path
from PIL import Image
from rembg import remove, new_session
ROOT = Path(__file__).resolve().parent.parent
SC = ROOT / 'app' / 'assets' / 'scene'; LAY = ROOT / 'layers' / 'a1'; LAY.mkdir(parents=True, exist_ok=True)
key = Image.open(ROOT / 'gen' / 'key-a1.png').convert('RGB'); W, H = key.size
BOX = (150, 840, 700, 1360)                      # 小猫所在的区域（定调图像素）
crop = key.crop(BOX)
sess = new_session('isnet-general-use')
cut = remove(crop, session=sess, post_process_mask=True)
a = np.asarray(cut).astype(np.float32) / 255
rgb = np.asarray(crop).astype(np.float32) / 255
alpha = a[..., 3]
# 只留和小猫连通的那一块
lab_n, lab = cv2.connectedComponents((alpha > 0.5).astype(np.uint8))
if lab_n > 2:
    sizes = [(lab == i).sum() for i in range(1, lab_n)]; keep = 1 + int(np.argmax(sizes)); alpha = alpha * (lab == keep)
alpha = cv2.GaussianBlur(alpha, (0, 0), 1.2)
ch, cw = alpha.shape
# 爪子：左下那只搭在纸边上的前爪（裁切内坐标）
paw_poly = np.array([(150, 345), (215, 330), (285, 345), (300, 400), (284, 440), (258, 468), (215, 486), (160, 470), (140, 410)], np.int32)
pm = np.zeros((ch, cw), np.uint8); cv2.fillPoly(pm, [paw_poly], 255); pm = cv2.GaussianBlur(pm.astype(np.float32) / 255, (0, 0), 4)
paw = np.dstack([rgb, alpha * pm])
# 头胸层：头（抠像）+ 下巴下面的胸口（手工范围），爪子挡住的地方补成胸口的毛
chest = np.zeros((ch, cw), np.float32); cv2.fillPoly(chest, [np.array([(168, 296), (335, 296), (352, 360), (338, 430), (172, 430), (150, 360)], np.int32)], 1.0)
chest = cv2.GaussianBlur(chest, (0, 0), 6)
# 胸口的毛：从侧身素材的胸口取一块，按这张图的暖光调一下
st = np.asarray(Image.open(ROOT / 'work' / 'cat-stand-rgba.png').convert('RGB')).astype(np.float32) / 255
tex = cv2.resize(st[440:580, 1150:1250], (cw, 190), interpolation=cv2.INTER_CUBIC)
texfull = np.zeros_like(rgb); texfull[270:460] = tex
shade = np.clip((np.arange(ch)[:, None] - 285) / 110, 0, 1) * 0.42 + 0.56
texfull = np.clip(texfull * shade[..., None] * np.array([1.0, 0.93, 0.82], np.float32), 0, 1)
ha = np.clip(alpha * (1 - pm) * 1.0, 0, 1)[..., None]
inp = rgb * ha + texfull * (1 - ha)
body_a = np.maximum(alpha, chest)
# 底边渐隐（身体往下没入纸包）
yy = np.linspace(0, 1, ch)[:, None]; body_a *= np.clip((0.84 - yy) / 0.1, 0, 1)
body = np.dstack([inp, body_a])
def save(name, arr):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA'); im.save(LAY / f'{name}.png'); im.save(SC / f'{name}.webp', quality=92, method=6); return im
save('a1-kitten', body); save('a1-paw', paw)
# 裂口遮罩：空纸包底图里那块黑的区域
op = np.asarray(Image.open(ROOT / 'gen' / 'a1-open.png').convert('RGB')).astype(np.float32) / 255
lum = op.max(axis=2)
dark = (lum < 0.30).astype(np.uint8)
region = np.zeros_like(dark); cv2.fillPoly(region, [np.array([(95, 800), (760, 800), (760, 1200), (480, 1400), (330, 1400), (95, 1200)], np.int32)], 1)
dark = cv2.morphologyEx(dark * region, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
n, lab = cv2.connectedComponents(dark); sizes = [(lab == i).sum() for i in range(1, n)]; m = (lab == 1 + int(np.argmax(sizes))).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
m = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2.0)
mask = np.zeros((H, W, 4), np.float32); mask[..., 3] = m; mask[..., :3] = 1
Image.fromarray((mask * 255).astype(np.uint8), 'RGBA').save(SC / 'a1-hole.png'); Image.fromarray((mask * 255).astype(np.uint8), 'RGBA').save(LAY / 'a1-hole.png')
ys, xs = np.where(m > 0.5); print('hole bbox', xs.min(), ys.min(), xs.max(), ys.max(), 'kitten box', BOX)
# 预览：空纸包 + 遮罩内的小猫 + 爪
prev = Image.open(ROOT / 'gen' / 'a1-open.png').convert('RGBA')
k = Image.new('RGBA', prev.size, (0, 0, 0, 0)); k.paste(Image.open(LAY / 'a1-kitten.png'), BOX[:2])
ka = np.asarray(k).copy(); ka[..., 3] = (ka[..., 3] * m).astype(np.uint8); prev.alpha_composite(Image.fromarray(ka, 'RGBA'))
p = Image.new('RGBA', prev.size, (0, 0, 0, 0)); p.paste(Image.open(LAY / 'a1-paw.png'), BOX[:2]); prev.alpha_composite(p)
prev.crop((40, 700, 820, 1500)).convert('RGB').save(ROOT / 'work' / '_a1-comp.png')
bg = Image.new('RGBA', (cw * 2 + 30, ch + 20), (60, 100, 80, 255)); bg.alpha_composite(Image.open(LAY / 'a1-kitten.png'), (10, 10)); bg.alpha_composite(Image.open(LAY / 'a1-paw.png'), (cw + 20, 10)); bg.convert('RGB').save(ROOT / 'work' / '_a1-layers.png')
