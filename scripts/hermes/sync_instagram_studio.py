#!/usr/bin/env python3
"""Sync the existing read-only studio collector and new Instagram draft IDs.

No Treg key copied to the website, no publishing call, no caption/status update.
The site bearer stays inside the private VPS container. SSH carries only the
allowlisted observations/captions over stdin, never via shell arguments.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import urllib.request

PRIVATE = Path.home() / 'Library/Application Support/HermesCockpit'
TOKEN_FILE = PRIVATE / 'studio-video/bridge-token'
RECEIPT_FILE = PRIVATE / 'studio-video/instagram-site-sync.json'
STUDIO_URL = 'http://127.0.0.1:3108/api/hermes/studio/instagram'
REMOTE = r'''docker exec -i antoinequarroz-web node --input-type=module -e '
let raw = "";
for await (const chunk of process.stdin) raw += chunk;
const key = process.env.NUXT_HERMES_PUBLISH_TOKEN || process.env.HERMES_PUBLISH_TOKEN;
if (!key) { console.log(JSON.stringify({ok:false,status:503})); process.exit(1); }
try {
  const response = await fetch("http://127.0.0.1:3000/api/hermes/instagram-sync", {
    method:"POST", headers:{"content-type":"application/json",authorization:"Bearer "+key},
    body:raw, signal:AbortSignal.timeout(20000)
  });
  const data = await response.json();
  console.log(JSON.stringify({ok:response.ok && data.ok === true,status:response.status,
    imported:Number.isSafeInteger(data.imported)?data.imported:null,
    receivedDrafts:Number.isSafeInteger(data.receivedDrafts)?data.receivedDrafts:null}));
  if (!response.ok) process.exit(1);
} catch { console.log(JSON.stringify({ok:false,status:503})); process.exit(1); }
'
'''.strip()


def payload(data):
    if not isinstance(data, dict) or not isinstance(data.get('snapshot'), dict) or not isinstance(data.get('drafts'), list):
        raise ValueError('Format du studio non confirmé.')
    source = data['snapshot']
    if source.get('expectedUsername') != 'antoinequarroz.dev' or source.get('readOnly') is not True or source.get('publishingEnabled') is not False or type(source.get('chargedMicroUSD')) is not int or source['chargedMicroUSD'] != 0:
        raise ValueError('Compte, lecture seule ou coût non confirmé.')
    fields = ('schemaVersion', 'expectedUsername', 'state', 'readOnly', 'publishingEnabled', 'collectedAt', 'lastSuccessfulAt', 'period', 'profile', 'metrics', 'media', 'chargedMicroUSD')
    snapshot = {name: source.get(name) for name in fields if name in source}
    # Never forward provider error text, credentials or a cache fingerprint.
    snapshot['errors'] = ['incomplete'] if source.get('errors') else []
    return {'snapshot': snapshot, 'drafts': [{'id': row['id'], 'caption': row['caption']} for row in data['drafts']]}


def write_receipt(value):
    RECEIPT_FILE.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    fd, temp = tempfile.mkstemp(dir=RECEIPT_FILE.parent, prefix='.instagram-site-')
    try:
        with os.fdopen(fd, 'w') as stream:
            json.dump(value, stream)
        os.chmod(temp, 0o600)
        os.replace(temp, RECEIPT_FILE)
    finally:
        if os.path.exists(temp): os.unlink(temp)


def sync_once():
    if TOKEN_FILE.stat().st_mode & 0o077:
        raise ValueError('Le secret du studio doit rester privé.')
    token = TOKEN_FILE.read_text().strip()
    request = urllib.request.Request(STUDIO_URL, headers={'X-Hermes-Studio-Token': token})
    with urllib.request.urlopen(request, timeout=40) as response:
        if response.status != 200: raise ValueError('Studio indisponible.')
        data = json.loads(response.read(500_001))
    body = json.dumps(payload(data), ensure_ascii=False, sort_keys=True).encode()
    if len(body) > 128 * 1024: raise ValueError('Relevé trop volumineux.')
    digest = hashlib.sha256(body).hexdigest()
    try:
        previous = json.loads(RECEIPT_FILE.read_text())
        if previous.get('digest') == digest: return {'ok': True, 'unchanged': True}
    except (OSError, ValueError): pass
    result = subprocess.run(['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2',
                             'antoine-vps', REMOTE], input=body, capture_output=True, timeout=50)
    try: receipt = json.loads(result.stdout)
    except ValueError: raise ValueError('La synchronisation SSH est indisponible.') from None
    if result.returncode != 0 or receipt.get('ok') is not True:
        raise ValueError('Le site a refusé la synchronisation (HTTP %s).' % receipt.get('status', 'inconnu'))
    write_receipt({'digest': digest, 'syncedAt': time.time(), 'collectedAt': data['snapshot'].get('collectedAt'), **receipt})
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--watch', action='store_true', help='Synchroniser les changements toutes les 60 secondes ; le collecteur conserve son cache d’une heure.')
    args = parser.parse_args()
    previous = None
    while True:
        try:
            result = sync_once()
            if not result.get('unchanged'): print(json.dumps(result), flush=True)
            previous = None
        except Exception as error:
            message = str(error) if isinstance(error, ValueError) else 'Studio ou liaison SSH indisponible. Le dernier relevé reste conservé sur le site.'
            if message != previous: print(json.dumps({'ok': False, 'message': message}), flush=True)
            previous = message
            if not args.watch: return 1
        if not args.watch: return 0
        time.sleep(60)

if __name__ == '__main__':
    raise SystemExit(main())
