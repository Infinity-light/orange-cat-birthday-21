r"""用 Codex 进程生图。
用法: python -X utf8 tools/gen.py <key> [--ref a.png b.png] [--shape portrait|landscape|square] [--force]
提示词放在 prompts/<key>.txt，成图写到 gen/<key>.png，日志在 gen/_log/。
带 --ref 时把参考图附给 Codex，并要求 image_gen 以它为输入图。
"""
import sys, json, shutil, subprocess, time, argparse
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "gen"; OUT.mkdir(exist_ok=True)
LOG = OUT / "_log"; LOG.mkdir(exist_ok=True)
PD = ROOT / "prompts"
GEN = Path.home() / ".codex" / "generated_images"
CODEX = shutil.which("codex.cmd") or shutil.which("codex")
MODELS = ["gpt-5.6-terra", "gpt-6-luna", "gpt-6-sol"]
SHAPE = {"portrait": "portrait 9:16 (tall, for a phone screen)", "landscape": "landscape 16:9", "square": "square 1:1", "p23": "portrait 2:3 (1024x1536)", "l32": "landscape 3:2 (1536x1024)"}

WRAP = """You are an image-generation worker. Do not read any files, do not run any shell commands, do not use any skill.
Call the built-in image_gen tool exactly ONCE, {shape}, at the largest available size, with the prompt below verbatim.
{ref}After the tool returns, reply with the single word DONE.

PROMPT:
"""
REF = "The attached image(s) are reference input: pass them to image_gen as input/reference images so the result follows them as the prompt describes.\n"


def once(k, model, prompt, shape, refs):
    cmd = [CODEX, "exec", "-m", model, "--ignore-user-config", "--skip-git-repo-check", "--ephemeral",
           "-s", "read-only", "-C", str(ROOT), "--json", "-c", 'model_reasoning_effort="low"']
    for r in refs: cmd += ["-i", str(r)]
    cmd += ["-"]
    t = time.time()
    try:
        r = subprocess.run(cmd, input=(WRAP.format(shape=SHAPE[shape], ref=REF if refs else "") + prompt).encode("utf-8"), capture_output=True, timeout=600)
    except subprocess.TimeoutExpired:
        return None, "timeout", time.time() - t
    out = r.stdout.decode("utf-8", "replace")
    (LOG / f"{k}.{model}.jsonl").write_text(out, encoding="utf-8")
    tid = None; err = ""
    for ln in out.splitlines():
        try: e = json.loads(ln)
        except Exception: continue
        if e.get("type") == "thread.started": tid = e["thread_id"]
        if e.get("type") == "turn.failed": err = e["error"]["message"]
    pngs = sorted((GEN / tid).glob("*.png"), key=lambda p: p.stat().st_mtime) if tid and (GEN / tid).exists() else []
    if not pngs: return None, err or f"no image (exit {r.returncode}) {r.stderr.decode('utf-8','replace')[-300:]}", time.time() - t
    dst = OUT / f"{k}.png"; shutil.copy2(pngs[-1], dst)
    return dst, f"{model} thread={tid} got={Image.open(dst).size}", time.time() - t


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("key"); ap.add_argument("--ref", nargs="*", default=[])
    ap.add_argument("--shape", default="portrait"); ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    if (OUT / f"{a.key}.png").exists() and not a.force: print(a.key, "exists"); sys.exit(0)
    prompt = (PD / f"{a.key}.txt").read_text(encoding="utf-8")
    msg = ""
    for rnd in range(2):
        for m in MODELS:
            dst, msg, dt = once(a.key, m, prompt, a.shape, a.ref)
            if dst: print(a.key, f"OK {msg} {dt:.0f}s", flush=True); sys.exit(0)
            print(a.key, "retry:", msg[:300], flush=True)
        time.sleep(10)
    print(a.key, "FAIL", msg[:300]); sys.exit(1)
