"""生成图 → 线上素材。python tools/prep-plates.py"""
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
SC = ROOT / 'app' / 'assets' / 'scene'; SC.mkdir(parents=True, exist_ok=True)
PH = ROOT / 'app' / 'assets' / 'photos'
for k in ['a1-open', 'a1-closed', 'a2-plate', 'a3-plate2', 'a5-plate', 'a7-plate', 'a4-map', 'a6-hall', 'a6-hall-open']:
    f = ROOT / 'gen' / f'{k}.png'
    if not f.exists(): print('missing', k); continue
    im = Image.open(f).convert('RGB'); im.save(SC / f'{k}.webp', quality=88, method=6); print(k, im.size, (SC / f'{k}.webp').stat().st_size // 1024, 'KB')
for k in ['p_desk', 'p_cat', 'p_roof', 'f_library', 'f_run', 'f_model', 'f_sea', 'f_window', 'm_seat', 'm_river']:
    im = Image.open(ROOT / 'gen' / f'{k}.png').convert('RGB').resize((900, 900), Image.LANCZOS); im.save(PH / f'{k}.jpg', quality=86)
