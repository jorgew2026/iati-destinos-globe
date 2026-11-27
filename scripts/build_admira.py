"""Generate a standalone signage page with the latest published GA4 snapshot."""
import base64
import os
import sys
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "scripts/admira"


def inline_json(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")


def build():
    site = ROOT / "site"
    page = (ASSETS / "screen.html").read_text(encoding="utf-8")
    snapshot = json.loads((site / "data.json").read_text(encoding="utf-8"))
    page = page.replace("__SNAPSHOT__", inline_json(snapshot))
    page = page.replace("__SCREEN_JS__", (ASSETS / "screen.js").read_text(encoding="utf-8"))
    page = page.replace("__FONT_LICENSE__", (ASSETS / "OFL.txt").read_text(encoding="utf-8"))
    for weight in (400, 600):
        encoded = base64.b64encode((ASSETS / f"onest-{weight}.woff2").read_bytes()).decode("ascii")
        page = page.replace(f"__ONEST_{weight}__", encoded)
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        chrome = os.environ.get("ADMIRA_CHROME")
        if not chrome and sys.platform == "darwin":
            chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        browser = playwright.chromium.launch(
            executable_path=chrome or None, channel=None if chrome else "chrome",
            args=["--disable-webgl"],
        )
        frame = browser.new_page(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        frame.set_content(page)
        frame.evaluate("Promise.all([document.fonts.load('400 16px Onest'), document.fonts.load('600 16px Onest')])")
        slides = []
        for index in range(6):
            label = frame.evaluate("index => window.renderAdmiraFrame(index)", index)
            jpeg = frame.screenshot(type="jpeg", quality=65)
            encoded = base64.b64encode(jpeg).decode("ascii")
            slides.append({"label": label, "image": "data:image/jpeg;base64," + encoded})
        browser.close()

    pack = inline_json({"updatedAt": snapshot["updatedAt"], "slides": slides})
    player = (ASSETS / "player.html").read_text(encoding="utf-8").replace("__SLIDES__", pack)
    (site / "admira-frames.json").write_text(pack, encoding="utf-8")
    (site / "admira.html").write_text(player, encoding="utf-8")


if __name__ == "__main__":
    build()
