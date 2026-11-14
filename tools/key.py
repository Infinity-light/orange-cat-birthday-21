"""蓝幕抠像: python tools/key.py in.png out.png   → RGBA（去蓝溢色 + 边缘颜色向内取样，消掉紫边）"""
import sys, numpy as np, cv2
from PIL import Image
def key(src, lo=0.03, hi=0.34):
    im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    d = b - g            # 毛色里蓝永远不超过绿；超过的就是蓝幕或被蓝幕染了
    a = 1 - np.clip((d - lo) / (hi - lo), 0, 1)
    rgb = np.dstack([r, g, np.minimum(b, g)])
    # 半透明边缘的颜色不可信（混了蓝）：用实心区域的颜色向外扩散来替换
    solid = (a > 0.97).astype(np.float32)
    acc = rgb * solid[..., None]; w = solid.copy()
    for _ in range(14):
        acc = cv2.blur(acc, (5, 5)); w = cv2.blur(w, (5, 5))
        fill = acc / np.maximum(w, 1e-6)[..., None]
        keep = solid[..., None]
        acc = rgb * keep + fill * (1 - keep) * (w[..., None] > 1e-4); w = np.maximum(solid, (w > 1e-4).astype(np.float32))
    mix = np.clip((a - 0.5) / 0.47, 0, 1)[..., None]      # 越透明越用扩散色
    rgb2 = rgb * mix + acc * (1 - mix)
    a = np.clip((a - 0.06) / 0.94, 0, 1)
    out = np.dstack([rgb2, a])
    return (np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)
if __name__ == '__main__':
    Image.fromarray(key(sys.argv[1]), 'RGBA').save(sys.argv[2])
