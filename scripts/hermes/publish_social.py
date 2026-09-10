#!/usr/bin/env python3
"""Publish one explicitly approved social draft, with local idempotency receipts."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import urllib.error
import urllib.request
from pathlib import Path


LINKEDIN_POSTS_ENDPOINT = "https://api.linkedin.com/rest/posts"
X_POSTS_ENDPOINT = "https://api.x.com/2/tweets"
CANONICAL_ARTICLE_PREFIX = "https://www.antoinequarroz.ch/blog/"
ALLOWED_DRAFT_ROOT = Path("seo/social/a-valider")
RECEIPT_ROOT = Path("seo/social/receipts")
LINKEDIN_VERSION = "202606"
X_POST_WITH_URL_ESTIMATED_USD = 0.20


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
    if not draft["article_url"].startswith(CANONICAL_ARTICLE_PREFIX):
        raise ValueError("L'URL doit etre un article public du site canonique.")
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


def publish_x(content: str) -> dict:
    allowed_cost = float(os.environ.get("HERMES_X_MAX_USD_PER_POST", "0") or "0")
    if allowed_cost < X_POST_WITH_URL_ESTIMATED_USD:
        raise RuntimeError(
            "Publication X bloquee par le plafond de cout. "
            f"Minimum requis: {X_POST_WITH_URL_ESTIMATED_USD:.2f} USD par post avec URL."
        )
    token = os.environ.get("X_USER_ACCESS_TOKEN", "").strip()
    if not token:
        raise RuntimeError("X_USER_ACCESS_TOKEN absent.")
    body, _ = request_json(
        X_POSTS_ENDPOINT,
        {"text": content},
        {
            "Authorization": f"Bearer {token}",
            "User-Agent": "hermes-antoinequarroz/1.0",
        },
    )
    return {"id": body.get("data", {}).get("id"), "response": body}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project", type=Path, default=Path("."))
    parser.add_argument("--draft", type=Path, required=True)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    project = args.project.resolve()
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
