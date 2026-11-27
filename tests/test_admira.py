import json
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AdmiraBuildTest(unittest.TestCase):
    def test_self_contained_signage(self):
        subprocess.run(["python3", "scripts/build_admira.py"], cwd=ROOT, check=True)
        page = (ROOT / "site/admira.html").read_text()
        match = re.search(r'<script type="application/json" id="snapshot">(.*?)</script>', page, re.S)
        self.assertIsNotNone(match)
        self.assertEqual(json.loads(match[1]), json.loads((ROOT / "site/data.json").read_text()))
        self.assertIn('getContext("2d")', page)
        self.assertNotRegex(page, r'<script[^>]+src=|<link[^>]+stylesheet|globe\.gl')
        self.assertIn('Pólizas vendidas esta semana', page)
        self.assertIn('id="total">', page)


if __name__ == "__main__":
    unittest.main()
