#!/usr/bin/env python3
"""Read Search Console directly with a dedicated, private Google credential.

Only the webmasters.readonly scope is requested. No browser, Treg or AI call.
"""
import argparse
import base64
import json
import os
import stat
import subprocess
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly'
TOKEN_URL = 'https://oauth2.googleapis.com/token'
API_ROOT = 'https://www.googleapis.com/webmasters/v3'
PROPERTY = 'sc-domain:antoinequarroz.ch'


class SearchConsoleError(RuntimeError):
    pass


def load_credentials(path=None):
    if path:
        target = Path(path)
        if target.is_symlink() or stat.S_IMODE(target.stat().st_mode) & 0o077:
            raise SearchConsoleError('Google credential file must be private (mode 600) and not a symlink')
        raw = target.read_text()
    else:
        encoded = os.environ.get('HERMES_GSC_CREDENTIALS_B64', '')
        if not encoded:
            raise SearchConsoleError('Direct Google credential missing; authorize Search Console read access')
        try:
            raw = base64.b64decode(encoded, validate=True).decode('utf-8')
        except (ValueError, UnicodeError):
            raise SearchConsoleError('Invalid private Google credential encoding') from None
    try:
        value = json.loads(raw)
    except ValueError:
        raise SearchConsoleError('Invalid private Google credential JSON') from None
    if not isinstance(value, dict):
        raise SearchConsoleError('Invalid private Google credential object')
    return value


def request_json(url, payload, token=None, form=False):
    headers = {'Content-Type': 'application/x-www-form-urlencoded' if form else 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = urllib.parse.urlencode(payload).encode() if form else json.dumps(payload).encode()
    request = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        # Never log response bodies: Google auth responses can contain credentials.
        raise SearchConsoleError('Google request refused (HTTP %s); verify API activation, authorization and property access' % error.code) from None
    except (urllib.error.URLError, TimeoutError):
        raise SearchConsoleError('Google request unavailable; no fresh Search Console measurement') from None
    except ValueError:
        raise SearchConsoleError('Google returned an invalid JSON response') from None
    if not isinstance(result, dict):
        raise SearchConsoleError('Google returned an invalid response object')
    return result


def encoded_json(value):
    return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).rstrip(b'=').decode()


def access_token(credentials, request=request_json, now=None):
    kind = credentials.get('type')
    if kind == 'service_account':
        email = credentials.get('client_email', '')
        private_key = credentials.get('private_key', '')
        if not email.endswith('.iam.gserviceaccount.com') or not private_key.startswith('-----BEGIN PRIVATE KEY-----'):
            raise SearchConsoleError('Invalid dedicated Google service account credential')
        issued = int((now or datetime.now(timezone.utc)).timestamp())
        header = {'alg': 'RS256', 'typ': 'JWT'}
        if credentials.get('private_key_id'):
            header['kid'] = credentials['private_key_id']
        claim = {'iss': email, 'scope': SCOPE, 'aud': TOKEN_URL, 'iat': issued, 'exp': issued + 3600}
        unsigned = encoded_json(header) + '.' + encoded_json(claim)
        try:
            with tempfile.TemporaryDirectory(prefix='hermes-gsc-') as directory:
                key_path = Path(directory) / 'key.pem'
                fd = os.open(str(key_path), os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(fd, 'w') as handle:
                    handle.write(private_key)
                signed = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', str(key_path)], input=unsigned.encode(), capture_output=True, timeout=10, check=True)
                signature = signed.stdout
        except (OSError, subprocess.SubprocessError):
            raise SearchConsoleError('Google RSA signing failed; verify the private key and OpenSSL installation') from None
        assertion = unsigned + '.' + base64.urlsafe_b64encode(signature).rstrip(b'=').decode()
        body = {'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion': assertion}
    elif kind == 'authorized_user':
        required = ('client_id', 'client_secret', 'refresh_token')
        if not all(credentials.get(k) for k in required):
            raise SearchConsoleError('Incomplete Google OAuth offline credential')
        body = {k: credentials[k] for k in required}
        body.update({'grant_type': 'refresh_token', 'scope': SCOPE})
    else:
        raise SearchConsoleError('A Google service_account or authorized_user credential is required')
    response = request(TOKEN_URL, body, form=True)
    granted = response.get('scope')
    if granted and set(granted.split()) != {SCOPE}:
        raise SearchConsoleError('Google credential must grant Search Console read access only')
    token = response.get('access_token')
    if not isinstance(token, str) or not token:
        raise SearchConsoleError('Google did not issue an access token')
    return token


def fetch_snapshot(credentials, request=request_json, now=None):
    now = now or datetime.now(timezone.utc)
    # Search Analytics dates are Pacific calendar dates. Leave three complete
    # days for Google processing; don't treat incomplete data as a decline.
    from zoneinfo import ZoneInfo
    end = now.astimezone(ZoneInfo('America/Los_Angeles')).date() - timedelta(days=3)
    start = end - timedelta(days=27)
    token = access_token(credentials, request=request, now=now)
    url = API_ROOT + '/sites/' + urllib.parse.quote(PROPERTY, safe='') + '/searchAnalytics/query'
    base = {'startDate': start.isoformat(), 'endDate': end.isoformat(), 'type': 'web', 'dataState': 'final'}
    total = request(url, base, token=token)
    rows = total.get('rows', [])
    if not isinstance(rows, list):
        raise SearchConsoleError('Invalid Google totals response')
    summary = rows[0] if rows else {'clicks': 0, 'impressions': 0, 'ctr': 0, 'position': None}
    tables = {}
    for name, dimension, limit in [('Dates', 'date', 28), ('Requêtes', 'query', 25), ('Pages', 'page', 25)]:
        response = request(url, dict(base, dimensions=[dimension], rowLimit=limit), token=token)
        results = response.get('rows', [])
        if not isinstance(results, list):
            raise SearchConsoleError('Invalid Google dimension response')
        tables[name] = [{'Dimension': row['keys'][0], 'Clics': row['clicks'], 'Impressions': row['impressions'], 'CTR': '%.2f%%' % (row['ctr'] * 100), 'Position': row['position']} for row in results]
    return {'status': 'direct_api', 'property': PROPERTY, 'capturedAt': now.isoformat(), 'period': {'startDate': start.isoformat(), 'endDate': end.isoformat(), 'days': 28, 'searchType': 'web', 'dataState': 'final'}, 'summary': {k: summary.get(k) for k in ('clicks', 'impressions', 'ctr', 'position')}, 'tables': tables, 'limitation': 'Google Search Analytics final data only; latency and anonymized queries apply. Totals come from a separate query without dimensions, not the sum of visible queries.'}


def atomic_write(path, value):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix='.gsc-', dir=str(target.parent))
    try:
        with os.fdopen(fd, 'w') as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write('\n')
        os.replace(temporary, target)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--credentials-file')
    parser.add_argument('--output', default='seo/search-console-direct.json')
    args = parser.parse_args()
    try:
        result = fetch_snapshot(load_credentials(args.credentials_file))
    except (SearchConsoleError, OSError) as error:
        atomic_write(args.output, {'status': 'not_measured', 'capturedAt': datetime.now(timezone.utc).isoformat(), 'reason': str(error) if isinstance(error, SearchConsoleError) else 'Private Google credential file unavailable'})
        print('Search Console unavailable; snapshot marked not_measured (no stale data presented as fresh)')
        return 1
    atomic_write(args.output, result)
    print(json.dumps({'status': result['status'], 'period': result['period'], 'clicks': result['summary']['clicks'], 'impressions': result['summary']['impressions']}))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
