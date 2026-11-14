# 字体子集化：扫描 app/ 下所有 js/html 里出现的字符，从霞鹜文楷里只取用到的字，生成 app/assets/fonts/wenkai-subset.woff2
# 换了文案（content.js）之后重新跑一次：python tools/subset-font.py
# 字体：LXGW WenKai（SIL OFL 1.1）。源文件约 19 MB，没有放进仓库：
# 从 https://github.com/lxgw/LxgwWenKai/releases 下载 LXGWWenKai-Regular.ttf 放到 tools/fontsrc/
# 依赖：pip install fonttools brotli
import os, glob, subprocess, sys
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
chars = set()
for pat in ('app/js/**/*.js', 'app/*.html'):
    for f in glob.glob(os.path.join(root, pat), recursive=True):
        chars.update(open(f, encoding='utf-8').read())
chars.update('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ，。！？、；：「」『』（）—…·～《》“”‘’ .,!?:;-_/()[]')
text = ''.join(sorted(c for c in chars if c >= ' '))
src = os.path.join(root, 'tools/fontsrc/LXGWWenKai-Regular.ttf')
out = os.path.join(root, 'app/assets/fonts/wenkai-subset.woff2')
os.makedirs(os.path.dirname(out), exist_ok=True)
os.makedirs(os.path.join(root, 'tools/fontsrc'), exist_ok=True)
tf = os.path.join(root, 'tools/fontsrc/chars.txt'); open(tf, 'w', encoding='utf-8').write(text)
from fontTools.ttLib import TTFont
from fontTools.subset import Subsetter, Options
font = TTFont(src, lazy=True)
# 这个字体的 format 4 cmap 子表在部分 fontTools 版本下解析会出错：只保留能解析的子表
cm = font['cmap'] if False else None
import fontTools.ttLib.tables._c_m_a_p as C
raw = font.reader['cmap']
tbl = C.table__c_m_a_p(); 
import struct
ver, n = struct.unpack('>HH', raw[:4]); good = []
for i in range(n):
    pid, eid, off = struct.unpack('>HHL', raw[4 + i * 8: 12 + i * 8])
    fmt, = struct.unpack('>H', raw[off:off + 2])
    if fmt in (12,):
        length, lang = struct.unpack('>LL', raw[off + 4: off + 12])
        st = C.cmap_classes[12](12); st.platformID = pid; st.platEncID = eid
        st.decompileHeader(raw[off:off + length], font); st.ensureDecompiled(); good.append(st)
assert good, 'no usable cmap'
tbl.tableVersion = 0; tbl.tables = good[:1]
font['cmap'] = tbl
opt = Options(); opt.flavor = 'woff2'; opt.layout_features = ['*']; opt.hinting = False
sub = Subsetter(opt); sub.populate(text=text); sub.subset(font)
font.flavor = 'woff2'; font.save(out)
print(len(text), 'chars ->', os.path.getsize(out), 'bytes')
# 字体文件一天内会被浏览器缓存：每次重新生成后，给引用它的地址换一个版本号，保证老访客也拿到新字
import hashlib, re
ver = hashlib.md5(open(out, 'rb').read()).hexdigest()[:8]
for rel in ('app/index.html', 'app/css/style.css'):
    fp = os.path.join(root, rel); s = open(fp, encoding='utf-8').read()
    s2 = re.sub(r'wenkai-subset\.woff2(\?v=[0-9a-f]+)?', 'wenkai-subset.woff2?v=' + ver, s)
    if s2 != s: open(fp, 'w', encoding='utf-8').write(s2)
print('font version', ver)
