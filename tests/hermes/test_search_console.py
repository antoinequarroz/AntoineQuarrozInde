import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]


def module(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts/hermes' / (name + '.py'))
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


gsc = module('fetch_search_console')
reconciliation = module('reconcile_seo_report')
OAUTH = {'type': 'authorized_user', 'client_id': 'fixture', 'client_secret': 'fixture', 'refresh_token': 'fixture'}


class SearchConsoleTests(unittest.TestCase):
    def test_totals_do_not_sum_anonymized_or_truncated_query_rows(self):
        requests = []

        def fake(url, body, **kwargs):
            requests.append((url, body, kwargs))
            if url == gsc.TOKEN_URL:
                return {'access_token': 'fixture', 'scope': gsc.SCOPE}
            if not body.get('dimensions'):
                return {'rows': [{'clicks': 11, 'impressions': 300, 'ctr': 11/300, 'position': 18.9}]}
            return {'rows': [{'keys': ['fixture'], 'clicks': 0, 'impressions': 40, 'ctr': 0, 'position': 7.05}]}

        result = gsc.fetch_snapshot(OAUTH, fake, datetime(2026, 10, 12, 12, tzinfo=timezone.utc))
        self.assertEqual(result['summary']['impressions'], 300)
        self.assertEqual(result['period']['startDate'], '2026-09-12')
        self.assertEqual(result['period']['endDate'], '2026-10-09')
        self.assertEqual(requests[0][1]['scope'], gsc.SCOPE)
        self.assertTrue(all(call[1].get('dataState') == 'final' for call in requests[1:]))
        self.assertTrue(all('sc-domain%3Aantoinequarroz.ch' in call[0] for call in requests[1:]))

    def test_refuses_google_token_with_write_scope(self):
        with self.assertRaises(gsc.SearchConsoleError):
            gsc.access_token(OAUTH, lambda *a, **k: {'access_token': 'fixture', 'scope': 'https://www.googleapis.com/auth/webmasters'})

    def test_service_account_jwt_has_readonly_scope_and_no_user_impersonation(self):
        pem = subprocess.run(['openssl', 'genpkey', '-algorithm', 'RSA', '-pkeyopt', 'rsa_keygen_bits:2048'], capture_output=True, check=True).stdout.decode()
        credentials = {'type': 'service_account', 'client_email': 'fixture@example.iam.gserviceaccount.com', 'private_key': pem, 'token_uri': 'https://untrusted.invalid'}
        def fake(url, body, **kwargs):
            self.assertEqual(url, gsc.TOKEN_URL)
            claim = json.loads(gsc.base64.urlsafe_b64decode(body['assertion'].split('.')[1] + '=='))
            self.assertEqual(claim['scope'], gsc.SCOPE)
            self.assertNotIn('sub', claim)
            return {'access_token': 'fixture'}
        self.assertEqual(gsc.access_token(credentials, fake), 'fixture')

    def test_private_credential_permissions_and_symlinks(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'credential.json'; path.write_text(json.dumps(OAUTH)); path.chmod(0o644)
            with self.assertRaises(gsc.SearchConsoleError): gsc.load_credentials(path)
            path.chmod(0o600); self.assertEqual(gsc.load_credentials(path), OAUTH)
            link = Path(directory)/'link'; link.symlink_to(path)
            with self.assertRaises(gsc.SearchConsoleError): gsc.load_credentials(link)

    def test_stale_api_data_is_unavailable_not_zero_or_fresh(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'snapshot.json'
            path.write_text(json.dumps({'status': 'direct_api', 'capturedAt': (datetime.now(timezone.utc)-timedelta(days=7)).isoformat(), 'tables': {}}))
            self.assertEqual(reconciliation.direct_gsc(path)['status'], 'not_measured')

    def test_failed_refresh_replaces_old_snapshot_without_credentials(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory)/'snapshot.json'; path.write_text('{"status":"direct_api"}')
            with patch.dict(os.environ, {}, clear=True), patch('sys.argv', ['fetch_search_console.py', '--output', str(path)]):
                self.assertEqual(gsc.main(), 1)
            self.assertEqual(json.loads(path.read_text())['status'], 'not_measured')
            self.assertEqual(path.stat().st_mode & 0o777, 0o600)


if __name__ == '__main__':
    unittest.main()
