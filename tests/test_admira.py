import base64
import json
from pathlib import Path
import re
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]


def jpeg_size(encoded):
    jpeg = base64.b64decode(encoded.split(",", 1)[1])
    offset = 2
    while offset + 9 <= len(jpeg) and jpeg[offset] == 0xFF:
        marker = jpeg[offset + 1]
        if marker in (0xC0, 0xC1, 0xC2):
            return (int.from_bytes(jpeg[offset + 7:offset + 9], "big"),
                    int.from_bytes(jpeg[offset + 5:offset + 7], "big"))
        offset += 2 + int.from_bytes(jpeg[offset + 2:offset + 4], "big")
    raise ValueError("No se encontraron las dimensiones del JPEG")


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
            self.assertEqual(jpeg_size(slide["image"]), (1536, 864))
        self.assertNotRegex(page, r"<canvas|requestAnimationFrame|getContext\(")
        self.assertLess(len(page.encode("utf-8")), 850_000)


if __name__ == "__main__":
    unittest.main()
