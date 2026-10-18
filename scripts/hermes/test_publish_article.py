#!/usr/bin/env python3
"""Offline payload contract checks; never publish an article."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


spec = importlib.util.spec_from_file_location("publish_article", Path(__file__).with_name("publish_article.py"))
publisher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(publisher)


class ArticlePayloadTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.path = Path(self.directory.name) / "article.json"
        self.payload = {"title": "Article de recette", "slug": "article-de-recette", "content": "Contenu source.", "coverImageDataUrl": "data:image/png;base64,AAAA"}

    def load(self, payload):
        self.path.write_text(json.dumps(payload), encoding="utf-8")
        return publisher.load_payload(self.path)

    def test_preserves_each_explicit_approved_style(self):
        for style in (publisher.LEGACY_COVER_STYLE, publisher.VIOLET_COVER_STYLE):
            with self.subTest(style=style):
                original = {**self.payload, "coverStyle": style}
                loaded = self.load(original)
                self.assertEqual(loaded["coverStyle"], style)
                self.assertEqual(loaded["content"], original["content"])
                self.assertEqual(json.loads(self.path.read_text())["coverStyle"], style)

    def test_defaults_only_an_absent_style_to_the_legacy_contract(self):
        loaded = self.load(self.payload)
        self.assertEqual(loaded["coverStyle"], publisher.LEGACY_COVER_STYLE)
        self.assertEqual(loaded["site"], publisher.SITE)
        self.assertIs(loaded["published"], True)

    def test_rejects_unknown_empty_or_non_string_styles_without_downgrading(self):
        for style in ("pixel-art", "aq-editorial-violet-space-grotesk-v2", publisher.VIOLET_COVER_STYLE + " ", "", None, False, 7, [], {}):
            with self.subTest(style=style):
                with self.assertRaisesRegex(ValueError, "style editorial approuve"):
                    self.load({**self.payload, "coverStyle": style})

    def test_requires_a_cover_for_both_approved_styles(self):
        for style in (publisher.LEGACY_COVER_STYLE, publisher.VIOLET_COVER_STYLE):
            with self.subTest(style=style):
                payload = {**self.payload, "coverStyle": style}
                del payload["coverImageDataUrl"]
                with self.assertRaisesRegex(ValueError, "image 16:9 conforme au style editorial valide"):
                    self.load(payload)


if __name__ == "__main__":
    unittest.main()
