import importlib.util
import unittest
from datetime import datetime, timezone
from pathlib import Path
spec=importlib.util.spec_from_file_location('report',Path(__file__).parents[2]/'scripts/hermes/reconcile_seo_report.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class PublicReceiptTests(unittest.TestCase):
 def test_dated_publications_exclude_drafts_future_and_duplicates(self):
  now=datetime(2026,10,12,tzinfo=timezone.utc)
  rows=[{'slug':'a','published':True,'published_at':'2026-10-09T09:18:39.66631+00:00'},{'slug':'a','published':True,'published_at':'2026-10-09T09:18:39.66631+00:00'},{'slug':'draft','published':False,'published_at':'2026-10-09T00:00:00Z'},{'slug':'future','published':True,'published_at':'2026-10-20T00:00:00Z'},{'slug':'old','published':True,'published_at':'2026-09-01T00:00:00Z'}]
  result=module.published_articles(rows,now);self.assertEqual([x['slug'] for x in result],['a','old']);self.assertEqual(sum(x['inLast7Days'] for x in result),1)
 def test_unknown_measurement_is_not_zero_or_connected(self):
  self.assertEqual(module.direct_gsc(None)['status'],'not_measured')
 def test_invalid_cms_response_fails_instead_of_false_zero(self):
  with self.assertRaises(ValueError):module.published_articles({'error':'unavailable'},datetime.now(timezone.utc))
 def test_unqualified_publication_dates_are_rejected(self):
  with self.assertRaises(ValueError):module.published_articles([{'slug':'a','published':True,'published_at':'2026-10-09T12:00:00'}],datetime.now(timezone.utc))
if __name__=='__main__':unittest.main()
