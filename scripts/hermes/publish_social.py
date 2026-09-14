#!/usr/bin/env python3
"""Publish approved social drafts locally or from the site's secure queue."""

from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


LINKEDIN_POSTS_ENDPOINT = "https://api.linkedin.com/rest/posts"
X_POSTS_ENDPOINT = "https://api.x.com/2/tweets"
CANONICAL_SITE_HOME = "https://www.antoinequarroz.ch/"
CANONICAL_ARTICLE_PREFIX = f"{CANONICAL_SITE_HOME}blog/"
ALLOWED_DRAFT_ROOT = Path("seo/social/a-valider")
RECEIPT_ROOT = Path("seo/social/receipts")
LINKEDIN_VERSION = "202606"
X_POST_WITH_URL_ESTIMATED_USD = 0.20
DEFAULT_SITE_URL = "https://www.antoinequarroz.ch"


def parse_draft(path: Path) -> dict[str, str]:
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---\n"):
        raise ValueError("Le brouillon doit commencer par un front matter Markdown.")
    try:
        raw_meta, body = text[4:].split("\n---\n", 1)
    except ValueError as exc:
        raise ValueError("Le front matter Markdown n'est pas ferme.") from exc

    metadata: dict[str, str] = {}
    for line in raw_meta.splitlines():
        if not line.strip():
            continue
        key, separator, value = line.partition(":")
        if not separator:
            raise ValueError(f"Metadonnee invalide: {line}")
        metadata[key.strip().lower()] = value.strip().strip('"').strip("'")

    platform = metadata.get("platform", "").lower()
    status = (metadata.get("status") or metadata.get("statut") or "").upper()
    article_url = metadata.get("article_url") or metadata.get("url_article") or ""
    content = body.strip()
    return {
        "platform": platform,
        "status": status,
        "article_url": article_url,
        "article_title": metadata.get("article_title") or metadata.get("titre") or "",
        "content": content,
    }


def validate_draft(path: Path, project: Path) -> dict[str, str]:
    allowed_root = (project / ALLOWED_DRAFT_ROOT).resolve()
    resolved_path = path.resolve()
    if resolved_path.parent != allowed_root:
        raise ValueError(f"Le brouillon doit etre directement dans {ALLOWED_DRAFT_ROOT}.")

    draft = parse_draft(resolved_path)
    if draft["platform"] not in {"linkedin", "x"}:
        raise ValueError("Plateforme autorisee: linkedin ou x.")
    if draft["status"] != "APPROUVE":
        raise ValueError("Publication refusee: le statut doit etre exactement APPROUVE.")
    if draft["article_url"] != CANONICAL_SITE_HOME and not draft["article_url"].startswith(CANONICAL_ARTICLE_PREFIX):
        raise ValueError("L'URL doit etre l'accueil ou un article public du site canonique.")
    if draft["article_url"] not in draft["content"]:
        raise ValueError("Le texte public doit contenir l'URL de l'article approuve.")
    if draft["platform"] == "x" and len(draft["content"]) > 280:
        raise ValueError("Le brouillon X depasse 280 caracteres.")
    if not draft["content"]:
        raise ValueError("Le brouillon est vide.")
    return draft


def request_json(url: str, payload: dict, headers: dict[str, str]) -> tuple[dict, dict[str, str]]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            response_body = response.read().decode("utf-8", errors="replace")
            parsed = json.loads(response_body) if response_body else {}
            return parsed, dict(response.headers.items())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Publication refusee par la plateforme ({exc.code}): {detail[:500]}") from exc


def site_request(site_url: str, token: str, *, payload: dict | None = None, path: str = "social-publications") -> dict:
    url = f"{site_url.rstrip('/')}/api/hermes/{path}"
    request = urllib.request.Request(
        url,
        data=None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {token}", "User-Agent": "hermes-antoinequarroz/1.0",
                 **({"Content-Type": "application/json"} if payload is not None else {})},
        method="POST" if payload is not None else "GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"File sociale indisponible ({exc.code}): {detail[:500]}") from exc


def publish_linkedin(content: str) -> dict:
    token = os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()
    author = os.environ.get("LINKEDIN_PERSON_URN", "").strip()
    if not token or not re.fullmatch(r"urn:li:person:[A-Za-z0-9_-]+", author):
        raise RuntimeError("LINKEDIN_ACCESS_TOKEN ou LINKEDIN_PERSON_URN absent/invalide.")
    payload = {
        "author": author,
        "commentary": content,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": [],
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False,
    }
    body, headers = request_json(
        LINKEDIN_POSTS_ENDPOINT,
        payload,
        {
            "Authorization": f"Bearer {token}",
            "X-Restli-Protocol-Version": "2.0.0",
            "Linkedin-Version": LINKEDIN_VERSION,
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
    )
    return {"id": headers.get("x-restli-id") or body.get("id"), "response": body}


def oauth1_quote(value: str) -> str:
    return urllib.parse.quote(value, safe="~-._")


def oauth1_authorization_header(
    method: str,
    url: str,
    consumer_key: str,
    consumer_secret: str,
    access_token: str,
    access_token_secret: str,
    *,
    nonce: str | None = None,
    timestamp: str | None = None,
) -> str:
    params = {
        "oauth_consumer_key": consumer_key,
        "oauth_nonce": nonce or secrets.token_hex(16),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_timestamp": timestamp or str(int(time.time())),
        "oauth_token": access_token,
        "oauth_version": "1.0",
    }
    normalized = "&".join(
        f"{oauth1_quote(key)}={oauth1_quote(value)}"
        for key, value in sorted(params.items())
    )
    signature_base = "&".join(
        oauth1_quote(part) for part in (method.upper(), url, normalized)
    )
    signing_key = f"{oauth1_quote(consumer_secret)}&{oauth1_quote(access_token_secret)}"
    signature = base64.b64encode(
        hmac.new(signing_key.encode(), signature_base.encode(), hashlib.sha1).digest()
    ).decode()
    params["oauth_signature"] = signature
    return "OAuth " + ", ".join(
        f'{oauth1_quote(key)}="{oauth1_quote(value)}"'
        for key, value in sorted(params.items())
    )


def publish_x(content: str) -> dict:
    allowed_cost = float(os.environ.get("HERMES_X_MAX_USD_PER_POST", "0") or "0")
    if allowed_cost < X_POST_WITH_URL_ESTIMATED_USD:
        raise RuntimeError(
            "Publication X bloquee par le plafond de cout. "
            f"Minimum requis: {X_POST_WITH_URL_ESTIMATED_USD:.2f} USD par post avec URL."
        )
    credentials = {
        "consumer_key": os.environ.get("X_API_KEY", "").strip(),
        "consumer_secret": os.environ.get("X_API_SECRET", "").strip(),
        "access_token": os.environ.get("X_ACCESS_TOKEN", "").strip(),
        "access_token_secret": os.environ.get("X_ACCESS_TOKEN_SECRET", "").strip(),
    }
    missing = [name for name, value in credentials.items() if not value]
    if missing:
        raise RuntimeError(f"Identifiants X OAuth 1.0a absents: {', '.join(missing)}.")
    authorization = oauth1_authorization_header(
        "POST",
        X_POSTS_ENDPOINT,
        credentials["consumer_key"],
        credentials["consumer_secret"],
        credentials["access_token"],
        credentials["access_token_secret"],
    )
    body, _ = request_json(
        X_POSTS_ENDPOINT,
        {"text": content},
        {
            "Authorization": authorization,
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
    )
    return {"id": body.get("data", {}).get("id"), "response": body}


def connection_state(platform: str) -> tuple[str, str]:
    if platform == "linkedin":
        author = os.environ.get("LINKEDIN_PERSON_URN", "").strip()
        ready = bool(os.environ.get("LINKEDIN_ACCESS_TOKEN", "").strip()) and bool(
            re.fullmatch(r"urn:li:person:[A-Za-z0-9_-]+", author)
        )
        return ("ready", "Connexion LinkedIn disponible dans Hermes.") if ready else ("blocked", "Connexion LinkedIn incomplète dans Hermes.")
    names = ("X_API_KEY", "X_API_SECRET", "X_ACCESS_TOKEN", "X_ACCESS_TOKEN_SECRET")
    credentials_ready = all(os.environ.get(name, "").strip() for name in names)
    allowed_cost = float(os.environ.get("HERMES_X_MAX_USD_PER_POST", "0") or "0")
    ready = credentials_ready and allowed_cost >= X_POST_WITH_URL_ESTIMATED_USD
    return ("ready", "Connexion X et plafond de coût disponibles dans Hermes.") if ready else ("blocked", "Connexion X ou plafond de coût encore incomplet dans Hermes.")


def external_post_url(platform: str, post_id: str | None) -> str | None:
    if not post_id:
        return None
    if platform == "x":
        return f"https://x.com/i/web/status/{urllib.parse.quote(str(post_id), safe='')}"
    return f"https://www.linkedin.com/feed/update/{urllib.parse.quote(str(post_id), safe=':')}"


def process_approved(site_url: str, token: str, *, dry_run: bool) -> dict:
    for platform in ("linkedin", "x"):
        state, message = connection_state(platform)
        site_request(site_url, token, payload={"action": "readiness", "platform": platform, "state": state, "message": message})
    queued = site_request(site_url, token).get("posts", [])
    summary = {"queued": len(queued), "published": 0, "failed": 0, "externalWrite": False}
    if dry_run:
        return summary
    for queued_post in queued:
        platform = queued_post.get("platform")
        state, _ = connection_state(platform)
        if state != "ready":
            continue
        claimed = site_request(site_url, token, payload={"action": "claim", "id": queued_post["id"], "version": queued_post["version"]})["post"]
        try:
            result = publish_linkedin(claimed["content"]) if platform == "linkedin" else publish_x(claimed["content"])
            post_id = result.get("id")
            site_request(site_url, token, payload={"action": "complete", "id": claimed["id"], "version": claimed["version"], "externalPostId": post_id, "externalPostUrl": external_post_url(platform, post_id)})
            summary["published"] += 1
            summary["externalWrite"] = True
        except Exception as exc:
            site_request(site_url, token, payload={"action": "fail", "id": claimed["id"], "version": claimed["version"], "error": str(exc)[:1000]})
            summary["failed"] += 1
    return summary


def sync_drafts(project: Path, site_url: str, token: str, *, dry_run: bool) -> dict:
    draft_root = (project / ALLOWED_DRAFT_ROOT).resolve()
    result: dict[str, object] = {"found": 0, "synced": 0, "errors": []}
    for draft_path in sorted(draft_root.glob("*.md")):
        result["found"] = int(result["found"]) + 1
        try:
            draft = parse_draft(draft_path)
            platform = draft["platform"]
            content = draft["content"]
            article_url = draft["article_url"]
            if platform not in {"linkedin", "x"}:
                raise ValueError("plateforme absente ou invalide")
            if (article_url != CANONICAL_SITE_HOME and not article_url.startswith(CANONICAL_ARTICLE_PREFIX)) or article_url not in content:
                raise ValueError("URL canonique absente du texte")
            if not content or len(content) > (280 if platform == "x" else 3000):
                raise ValueError("longueur de texte invalide")
            if not dry_run:
                site_request(site_url, token, path="social-drafts", payload={
                    "platform": platform,
                    "sourceKey": draft_path.stem,
                    "articleTitle": draft["article_title"] or draft_path.stem.replace("-", " ").strip().capitalize(),
                    "articleUrl": article_url,
                    "content": content,
                    "sourcePath": str(draft_path.relative_to(project)),
                })
            result["synced"] = int(result["synced"]) + 1
        except Exception as exc:
            errors = result["errors"]
            assert isinstance(errors, list)
            errors.append({"file": draft_path.name, "error": str(exc)[:300]})
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path("."))
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--draft", type=Path)
    mode.add_argument("--process-approved", action="store_true")
    mode.add_argument("--sync-drafts", action="store_true")
    parser.add_argument("--site-url", default=os.environ.get("HERMES_SITE_URL", DEFAULT_SITE_URL))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project = args.project.resolve()
    if args.process_approved:
        token = os.environ.get("HERMES_PUBLISH_TOKEN", "").strip()
        if not token:
            raise RuntimeError("HERMES_PUBLISH_TOKEN absent.")
        print(json.dumps(process_approved(args.site_url, token, dry_run=args.dry_run), ensure_ascii=False))
        return 0
    if args.sync_drafts:
        token = os.environ.get("HERMES_PUBLISH_TOKEN", "").strip()
        if not token:
            raise RuntimeError("HERMES_PUBLISH_TOKEN absent.")
        print(json.dumps(sync_drafts(project, args.site_url, token, dry_run=args.dry_run), ensure_ascii=False))
        return 0

    assert args.draft is not None
    draft_path = args.draft if args.draft.is_absolute() else project / args.draft
    draft = validate_draft(draft_path, project)
    fingerprint = hashlib.sha256(
        f"{draft['platform']}\n{draft['content']}".encode("utf-8")
    ).hexdigest()[:32]
    receipt_path = project / RECEIPT_ROOT / f"{fingerprint}.json"

    if receipt_path.exists():
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        receipt["idempotent"] = True
        print(json.dumps(receipt, ensure_ascii=False))
        return 0

    if args.dry_run:
        print(json.dumps({
            "status": "validated",
            "platform": draft["platform"],
            "articleUrl": draft["article_url"],
            "characters": len(draft["content"]),
            "fingerprint": fingerprint,
            "externalWrite": False,
        }, ensure_ascii=False))
        return 0

    result = publish_linkedin(draft["content"]) if draft["platform"] == "linkedin" else publish_x(draft["content"])
    receipt = {
        "status": "published",
        "platform": draft["platform"],
        "articleUrl": draft["article_url"],
        "postId": result.get("id"),
        "fingerprint": fingerprint,
        "idempotent": False,
    }
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
