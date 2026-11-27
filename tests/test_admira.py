import json
from pathlib import Path
import re
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AdmiraBuildTest(unittest.TestCase):
    def test_build_uses_prerendered_images(self):
        subprocess.run([sys.executable, "scripts/build_admira.py"], cwd=ROOT, check=True)
        page = (ROOT / "site/admira.html").read_text()
        match = re.search(r'<script type="application/json" id="slides">(.*?)</script>', page, re.S)
        self.assertIsNotNone(match)
        pack = json.loads(match[1])
        self.assertEqual(pack, json.loads((ROOT / "site/admira-frames.json").read_text()))
        self.assertEqual(pack["updatedAt"], json.loads((ROOT / "site/data.json").read_text())["updatedAt"])
        snapshot = json.loads((ROOT / "site/data.json").read_text())
        market_labels = {"ES": "España", "PT": "Portugal", "IT": "Italia", "LATAM": "LATAM", "ROW": "Resto del mundo"}
        expected = [("Todos los mercados", sum(m["policies"] for m in snapshot["markets"].values()))]
        expected.extend((label, snapshot["markets"].get(key, {}).get("policies", 0))
                        for key, label in market_labels.items())
        labels = [f"Panel split-flap · {label} · {count:,}".replace(",", ".") + " pólizas esta semana"
                  for label, count in expected]
        self.assertEqual([slide["label"] for slide in pack["slides"]], labels)
        for slide in pack["slides"]:
            self.assertTrue(slide["image"].startswith("data:image/jpeg;base64,/9j/"))
        self.assertNotRegex(page, r"<canvas|requestAnimationFrame|getContext\(")
        self.assertLess(len(page.encode("utf-8")), 850_000)


if __name__ == "__main__":
    unittest.main()
