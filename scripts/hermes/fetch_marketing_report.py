#!/usr/bin/env python3
"""Fetch the bounded read-only PostHog report prepared by the website."""
import json
import os
import urllib.error
import urllib.request

URL = 'https://www.antoinequarroz.ch/api/hermes/marketing-report'
MAX_BYTES = 200_000

def fetch(token: str):
    if not token or '\n' in token or '\r' in token:
        raise RuntimeError('HERMES_READ_TOKEN absent ou invalide.')
    request = urllib.request.Request(URL, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'})
    with urllib.request.urlopen(request, timeout=60) as response:
        if response.status != 200 or response.geturl() != URL or response.headers.get_content_type() != 'application/json':
            raise RuntimeError('Réponse marketing refusée.')
        raw = response.read(MAX_BYTES + 1)
        if len(raw) > MAX_BYTES: raise RuntimeError('Rapport marketing trop volumineux.')
    value = json.loads(raw)
    if value.get('schemaVersion') != 1 or value.get('periodDays') != 7:
        raise RuntimeError('Contrat marketing incompatible.')
    return value

def render(value):
    now, before = value['current'], value['previous']
    lines = ['# Rapport marketing hebdomadaire FRIDAY', '', f"Généré le {value['generatedAt']}. Fenêtre : 7 jours, comparée aux 7 jours précédents.", '', '## Résultats',
      '', f"- Visiteurs : **{now['visitors']}** (période précédente : {before['visitors']}).", f"- Pages vues : **{now['pageviews']}** (précédente : {before['pageviews']}).",
      f"- Lecteurs d’articles ou projets : **{now['contentVisitors']}**.", f"- Intentions de contact : **{now['contactIntents']}**.",
      f"- Demandes envoyées : **{now['contacts']}**.", f"- Inscriptions newsletter : **{now['newsletterSubscriptions']}**.",
      f"- Clics rendez-vous : **{now['bookingClicks']}**.", f"- Rendez-vous confirmés : **{now['bookingConfirmations']}**.",
      f"- Nouveaux prospects CRM : **{now['crmLeads']}**.", f"- Clients gagnés : **{now['clientsWon']}**.",
      f"- Devis acceptés : **{now['acceptedQuotes']}** ({now['acceptedQuoteCents'] / 100:.0f} CHF).", f"- Factures créées : **{now['invoicesCreated']}**.",
      f"- Erreurs publiques : **{now['publicErrors']}**.", '', '## Sources']
    lines += [f"- {row['source']} : {row['pageviews']} pages vues." for row in value['sources']] or ['- Aucune source mesurée.']
    lines += ['', '## Contenus'] + ([f"- {row['path']} : {row['pageviews']} pages vues, {row['visitors']} visiteurs." for row in value['content']] or ['- Aucun article ou projet lu pendant la période.'])
    lines += ['', '## Recommandations'] + [f"- {item}" for item in value['recommendations']]
    lines += ['', '## Limites'] + [f"- {item}" for item in value['limits']]
    return '\n'.join(lines) + '\n'

if __name__ == '__main__':
    try: print(render(fetch(os.environ.get('HERMES_READ_TOKEN', ''))), end='')
    except Exception as exc: raise SystemExit('Rapport marketing indisponible : ' + str(exc))
