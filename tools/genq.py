r"""批量生图队列: python -X utf8 tools/genq.py -j 3 "key|shape|ref1;ref2" ...  （内部逐个调 gen.py）"""
import sys, subprocess, argparse, concurrent.futures as cf
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
def run(spec):
    k, shape, refs = (spec.split("|") + ["", ""])[:3]
    cmd = [sys.executable, "-X", "utf8", str(ROOT / "tools" / "gen.py"), k, "--shape", shape or "portrait"]
    if "!" in k: cmd[4] = k.replace("!", ""); cmd.append("--force")
    if refs: cmd += ["--ref"] + refs.split(";")
    r = subprocess.run(cmd, capture_output=True, cwd=str(ROOT))
    return r.stdout.decode("utf-8", "replace").strip().splitlines()[-1:] 
ap = argparse.ArgumentParser(); ap.add_argument("specs", nargs="+"); ap.add_argument("-j", type=int, default=3)
a = ap.parse_args()
with cf.ThreadPoolExecutor(a.j) as ex:
    for out in ex.map(run, a.specs): print(*out, flush=True)
