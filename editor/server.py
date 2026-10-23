"""
Local portfolio editor.

Run "Edit Portfolio.bat" (or `python editor/server.py`) and the editor opens
in your browser. It only listens on your own computer (127.0.0.1), so nobody
else can reach it.

  /            your site, exactly as visitors see it
  /editor/     the editor
  /api/save    writes data.js
  /api/upload  saves an image into assets/
  /api/publish commits and pushes to GitHub (the live site updates ~1 min later)
"""

import json
import os
import re
import subprocess
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
DATA_JS = os.path.join(ROOT, "data.js")
PORT = int(os.environ.get("PORTFOLIO_EDITOR_PORT", "5180"))
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"}
MAX_UPLOAD = 25 * 1024 * 1024

HEADER = (
    "// Written by the portfolio editor (double-click \"Edit Portfolio.bat\").\n"
    "// You can still edit this by hand; keep everything after the = valid JSON.\n"
)


def run_git(*args):
    p = subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True, timeout=120)
    return p.returncode, (p.stdout + p.stderr).strip()


def safe_name(name):
    base, ext = os.path.splitext(os.path.basename(name))
    base = re.sub(r"[^A-Za-z0-9_-]+", "-", base).strip("-").lower() or "image"
    return base[:60], ext.lower()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        # always serve fresh files so edits show up immediately
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        if "/api/" in (args[0] if args else ""):
            sys.stderr.write("  " + (fmt % args) + "\n")

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self, limit):
        n = int(self.headers.get("Content-Length") or 0)
        if n > limit:
            raise ValueError("File is too large (max 25 MB).")
        return self.rfile.read(n)

    def do_GET(self):
        if self.path == "/api/ping":
            return self.reply(200, {"ok": True})
        return super().do_GET()

    def do_POST(self):
        # only accept requests coming from the editor page itself
        origin = self.headers.get("Origin", "")
        if origin and origin not in (f"http://127.0.0.1:{PORT}", f"http://localhost:{PORT}"):
            return self.reply(403, {"error": "Forbidden"})
        url = urlparse(self.path)
        try:
            if url.path == "/api/save":
                return self.save()
            if url.path == "/api/upload":
                return self.upload(parse_qs(url.query))
            if url.path == "/api/publish":
                return self.publish()
            return self.reply(404, {"error": "Unknown action"})
        except Exception as e:  # report every failure back to the editor
            return self.reply(400, {"error": str(e)})

    def save(self):
        data = json.loads(self.read_body(5 * 1024 * 1024))
        if not isinstance(data, dict) or not isinstance(data.get("projects"), list):
            raise ValueError("That doesn't look like portfolio data.")
        text = HEADER + "window.PORTFOLIO = " + json.dumps(data, indent=2, ensure_ascii=False) + ";\n"
        tmp = DATA_JS + ".tmp"
        with open(tmp, "w", encoding="utf-8", newline="\n") as f:
            f.write(text)
        os.replace(tmp, DATA_JS)
        self.reply(200, {"ok": True})

    def upload(self, q):
        folder = re.sub(r"[^a-z0-9_-]+", "-", (q.get("folder", ["misc"])[0]).lower()).strip("-") or "misc"
        base, ext = safe_name(q.get("name", ["image.png"])[0])
        if ext not in IMAGE_EXTS:
            raise ValueError(f"{ext or 'That file'} isn't a supported image type.")
        body = self.read_body(MAX_UPLOAD)
        target_dir = os.path.join(ASSETS, folder)
        os.makedirs(target_dir, exist_ok=True)
        name, n = base + ext, 2
        while os.path.exists(os.path.join(target_dir, name)):
            name, n = f"{base}-{n}{ext}", n + 1
        with open(os.path.join(target_dir, name), "wb") as f:
            f.write(body)
        self.reply(200, {"path": f"assets/{folder}/{name}"})

    def publish(self):
        msg = (json.loads(self.read_body(10_000) or b"{}").get("message") or "Update portfolio").strip()[:200]
        code, out = run_git("add", "-A")
        if code:
            raise RuntimeError(out)
        if run_git("diff", "--cached", "--quiet")[0] == 0:
            return self.reply(200, {"ok": True, "message": "Nothing new to publish - the live site is already up to date."})
        code, out = run_git("commit", "-m", msg)
        if code:
            raise RuntimeError(out)
        code, out = run_git("push", "origin", "HEAD")
        if code:
            raise RuntimeError("Saved a commit locally, but pushing to GitHub failed:\n" + out)
        self.reply(200, {"ok": True, "message": "Published! The live site updates in about a minute."})


def main():
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    except OSError:
        print(f"Port {PORT} is busy - the editor is probably already open. Opening it in your browser.")
        webbrowser.open(f"http://localhost:{PORT}/editor/")
        return
    url = f"http://localhost:{PORT}/editor/"
    print(f"\n  Portfolio editor running at {url}\n  Close this window to stop it.\n")
    if "--no-browser" not in sys.argv:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
