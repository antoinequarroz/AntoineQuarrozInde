import unittest
from sync_instagram_studio import payload


class CollectorCompatibility(unittest.TestCase):
    def test_emoji_preview_preserves_source_and_full_draft(self):
        caption = '🚀' + 'a' * 299
        draft = '💡 Mon texte complet ' * 30
        source = {'snapshot': {'expectedUsername': 'antoinequarroz.dev', 'readOnly': True,
                  'publishingEnabled': False, 'chargedMicroUSD': 0,
                  'media': [{'caption': caption, 'id': '123'}]},
                  'drafts': [{'id': 'stable-id', 'caption': draft}]}
        result = payload(source)
        self.assertEqual(len(result['snapshot']['media'][0]['caption'].encode('utf-16-le')) // 2, 300)
        self.assertTrue(result['snapshot']['media'][0]['caption'].startswith('🚀'))
        self.assertEqual(result['drafts'][0]['caption'], draft)
        self.assertEqual(source['snapshot']['media'][0]['caption'], caption)


if __name__ == '__main__':
    unittest.main()
