"""Generate a standalone signage page with the latest published GA4 snapshot."""
import base64
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "scripts/admira"


def inline_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def build():
    site = ROOT / "site"
    original = (site / "index.html").read_text(encoding="utf-8")
    match = re.search(r"^window\.GEO=(.+);$", original, re.M)
    if not match:
        raise ValueError("No se encontró la cartografía en site/index.html")
    page = (ASSETS / "screen.html").read_text(encoding="utf-8")
    page = page.replace("__MAP__", inline_json(json.loads(match[1])))
    snapshot = json.loads((site / "data.json").read_text(encoding="utf-8"))
    page = page.replace("__SNAPSHOT__", inline_json(snapshot))
    page = page.replace("__SCREEN_JS__", (ASSETS / "screen.js").read_text(encoding="utf-8"))
    page = page.replace("__FONT_LICENSE__", (ASSETS / "OFL.txt").read_text(encoding="utf-8"))
    for weight in (400, 600):
        encoded = base64.b64encode((ASSETS / f"onest-{weight}.woff2").read_bytes()).decode("ascii")
        page = page.replace(f"__ONEST_{weight}__", encoded)
    (site / "admira.html").write_text(page, encoding="utf-8")


if __name__ == "__main__":
    build()
