#!/usr/bin/env python3
"""Reconcile a weekly file-based report with public CMS and direct GSC exports.
No credentials, Google OAuth flow, paid services or publishing actions.
"""
import argparse
import csv
import io
import json
import re
import urllib.request
import urllib.robotparser
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

SITE = 'https://www.antoinequarroz.ch'

def published_articles(rows, now):
    if not isinstance(rows, list):
        raise ValueError('CMS article list is not available')
    result = []
    seen = set()
    for row in rows:
        slug = row.get('slug')
        if not row.get('published') or not slug or slug in seen:
            continue
        raw = row.get('published_at') or row.get('publishedAt')
        if not raw:
            continue
        normalized = re.sub(r'\.(\d+)', lambda m: '.' + (m.group(1) + '000000')[:6], raw.replace('Z', '+00:00'), count=1)
        date = datetime.fromisoformat(normalized)
        if date.tzinfo is None:
            raise ValueError('Publication date without timezone')
        if date > now:
            continue
        seen.add(slug)
        result.append({'slug': slug, 'title': row.get('title'), 'publishedAt': date.isoformat(), 'inLast7Days': now - timedelta(days=7) <= date})
    return result

def direct_gsc(path):
    if not path:
        return {'status': 'not_measured', 'reason': 'No direct Search Console export supplied'}
    if Path(path).suffix == '.json':
        value = json.loads(Path(path).read_text())
        if value.get('status') == 'not_measured':
            return {'status': 'not_measured', 'reason': value.get('reason', 'Direct Google measurement unavailable')}
        if value.get('status') not in ('direct_export', 'direct_api') or not isinstance(value.get('tables'), dict):
            raise ValueError('Invalid direct Search Console snapshot')
        if value['status'] == 'direct_api':
            captured = datetime.fromisoformat(value.get('capturedAt', '').replace('Z', '+00:00'))
            if captured.tzinfo is None:
                raise ValueError('Search Console API capture date without timezone')
            age = datetime.now(timezone.utc) - captured
            if age > timedelta(hours=36) or age < -timedelta(minutes=10):
                return {'status': 'not_measured', 'reason': 'Search Console API snapshot is stale or has an invalid capture date'}
        return value
    tables = {}
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if name.lower().endswith('.csv'):
                text = archive.read(name).decode('utf-8-sig')
                tables[Path(name).stem] = list(csv.DictReader(io.StringIO(text)))
    if not tables:
        raise ValueError('Search Console export contains no CSV tables')
    return {'status': 'direct_export', 'file': Path(path).name, 'tables': tables, 'limitation': 'Manual dated export; not an authenticated scheduled Google API connection. Query totals may omit anonymized queries.'}

def get(path):
    req = urllib.request.Request(SITE + path, headers={'User-Agent': 'HermesSEOReconciliation/1.0'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode('utf-8')

def reconcile(export=None):
    now = datetime.now(timezone.utc)
    articles = published_articles(json.loads(get('/api/articles')), now)
    robots = urllib.robotparser.RobotFileParser(); robots.parse(get('/robots.txt').splitlines())
    return {'generatedAt': now.isoformat(), 'source': SITE + '/api/articles', 'publishedLast7Days': sum(x['inLast7Days'] for x in articles), 'articles': articles, 'crawlers': {'OAI-SearchBot': {'allowed': robots.can_fetch('OAI-SearchBot', SITE + '/'), 'purpose': 'search'}, 'GPTBot': {'allowed': robots.can_fetch('GPTBot', SITE + '/'), 'purpose': 'training; a block alone is not a search visibility failure'}}, 'searchConsole': direct_gsc(export), 'limitations': ['Production count comes from public CMS, not local source files.', 'No generated/produced count is inferred from publications.', 'No sales or invoices are attributed to SEO without evidence.', 'Fewer than 300 words is not by itself a Google ranking error.', 'An old sitemap alert must be revalidated against the latest runtime audit.']}

def render(v):
    lines = ['# Correctif du rapport SEO Hermes', '', 'Réconciliation du ' + v['generatedAt'], '', '## Publications réellement publiques', '', f"- {v['publishedLast7Days']} articles publiés sur les sept derniers jours, vérifiés dans le CMS public.", '- Le compteur de fichiers locaux ne mesure pas la publication.', '', '## Exploration', '', '- OAI-SearchBot : ' + ('autorisé' if v['crawlers']['OAI-SearchBot']['allowed'] else 'bloqué'), '- GPTBot : ' + ('autorisé' if v['crawlers']['GPTBot']['allowed'] else 'bloqué') + ' (entraînement ; ne pas assimiler ce choix à un blocage de la recherche ChatGPT).', '', '## Search Console', '', '- État : ' + v['searchConsole']['status']]
    gsc = v['searchConsole']
    if gsc.get('capturedAt'):
        lines += ['- Collecte : ' + gsc['capturedAt']]
    if gsc.get('reason'):
        lines += ['- Mesure indisponible : ' + gsc['reason']]
    if gsc.get('period'):
        period = gsc['period']
        lines += [f"- Période Google : {period['startDate']} au {period['endDate']} (données finales, recherche web)."]
    if gsc.get('summary'):
        summary = gsc['summary']
        lines += [f"- {summary['clicks']} clics ; {summary['impressions']} impressions ; CTR {summary['ctr'] * 100:.2f} % ; position moyenne : {summary['position']}."]
    if gsc.get('previous'):
        previous = gsc['previous']; summary = previous['summary']
        lines += [f"- Comparaison : {previous['startDate']} au {previous['endDate']} — {summary['clicks']} clics, {summary['impressions']} impressions."]
    for name, rows in v['searchConsole'].get('tables', {}).items():
        lines += ['', '### ' + name, '']
        if rows:
            keys = list(rows[0]); lines += ['| ' + ' | '.join(keys) + ' |', '| ' + ' | '.join(['---'] * len(keys)) + ' |']
            ordered = sorted(rows, key=lambda row: row.get('Dimension', '')) if name == 'Dates' else sorted(rows, key=lambda row: float(row.get('Impressions', 0)), reverse=True) if 'Impressions' in keys else rows
            displayed = ordered if name == 'Dates' else ordered[:10]
            lines += ['| ' + ' | '.join(str(row.get(k, '')).replace('|','/') for k in keys) + ' |' for row in displayed]
            if len(displayed) < len(rows): lines += [f"\nAffichage : {len(displayed)} lignes sur {len(rows)} retournées ; extrait, pas totalité du trafic."]
    lines += ['', '## Limites', ''] + ['- ' + x for x in v['limitations']]
    if v['searchConsole'].get('limitation'): lines += ['- ' + v['searchConsole']['limitation']]
    return '\n'.join(lines) + '\n'

if __name__ == '__main__':
    parser = argparse.ArgumentParser();parser.add_argument('--gsc-export');parser.add_argument('--output', required=True);args=parser.parse_args()
    v=reconcile(args.gsc_export);p=Path(args.output);p.parent.mkdir(parents=True,exist_ok=True);p.write_text(render(v));p.with_suffix('.json').write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'report': str(p), 'publishedLast7Days':v['publishedLast7Days'],'searchConsole':v['searchConsole']['status']}))
